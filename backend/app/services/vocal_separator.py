import os
import sys
import uuid
import asyncio
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, Callable
import numpy as np

from ..config import UPLOADS_DIR, AUDIO_CACHE_DIR, BASE_DIR, FFMPEG_PATH, SUBPROCESS_FLAGS
from .whisper_stt import resolve_media_file

# Singleton model interpreter cache
_TFLITE_INTERPRETER = None
_TFLITE_DETAILS = None

def get_vocal_model_path() -> Path:
    """Finds the UVR-MDX-NET-Voc_FT tflite model in known locations"""
    candidates = [
        BASE_DIR / "models" / "UVR-MDX-NET-Voc_FT.fp16acc.tflite",
        Path("d:/Coding/mk_subtitle/models/UVR-MDX-NET-Voc_FT.fp16acc.tflite"),
        Path("C:/Users/Makara-Network/Downloads/UVR-MDX-NET-Voc_FT.fp16acc.tflite")
    ]
    for p in candidates:
        if p.exists() and p.is_file():
            return p
    raise FileNotFoundError("UVR-MDX-NET-Voc_FT.fp16acc.tflite model file not found.")

def _get_interpreter():
    """Lazily loads and returns the TFLite interpreter with XNNPACK acceleration"""
    global _TFLITE_INTERPRETER, _TFLITE_DETAILS
    if _TFLITE_INTERPRETER is not None:
        return _TFLITE_INTERPRETER, _TFLITE_DETAILS

    try:
        import ai_edge_litert.interpreter as tflite
    except ImportError:
        try:
            import tflite_runtime.interpreter as tflite
        except ImportError:
            import tensorflow.lite as tflite

    model_path = get_vocal_model_path()
    interp = tflite.Interpreter(model_path=str(model_path))
    interp.allocate_tensors()
    
    in_idx = interp.get_input_details()[0]['index']
    out_idx = interp.get_output_details()[0]['index']
    
    _TFLITE_INTERPRETER = interp
    _TFLITE_DETAILS = (in_idx, out_idx)
    return _TFLITE_INTERPRETER, _TFLITE_DETAILS

def extract_stereo_audio(input_media: Path, output_wav: Path) -> bool:
    """Extracts 44.1kHz stereo 16-bit PCM audio from video for UVR separation"""
    cmd = [
        FFMPEG_PATH, "-y",
        "-i", str(input_media),
        "-vn",
        "-ar", "44100",
        "-ac", "2",
        "-c:a", "pcm_s16le",
        str(output_wav)
    ]
    res = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=SUBPROCESS_FLAGS
    )
    return res.returncode == 0

def encode_audio_mp3(wav_path: Path, mp3_path: Path) -> bool:
    """Encodes WAV to compact, high-quality 192k MP3 for web streaming and fast loading"""
    cmd = [
        FFMPEG_PATH, "-y",
        "-i", str(wav_path),
        "-b:a", "192k",
        str(mp3_path)
    ]
    res = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=SUBPROCESS_FLAGS
    )
    return res.returncode == 0

def separate_vocals_sync(
    media_path: Path,
    progress_callback: Optional[Callable[[float, str], None]] = None
) -> Dict[str, Any]:
    """
    Synchronously extracts vocals vs instrumental BGM from media file
    using UVR-MDX-NET-Voc_FT (TFLite).
    """
    if progress_callback:
        progress_callback(5.0, "Extracting video soundtrack...")

    uid = uuid.uuid4().hex[:8]
    temp_raw_wav = AUDIO_CACHE_DIR / f"temp_raw_{uid}.wav"
    
    # 1. Extract 44.1kHz stereo audio
    if not extract_stereo_audio(media_path, temp_raw_wav):
        raise RuntimeError(f"Failed to extract audio from '{media_path.name}' via FFmpeg.")

    try:
        if progress_callback:
            progress_callback(15.0, "Loading audio spectrogram...")

        # 2. Load audio array [2, samples]
        import soundfile as sf
        import librosa
        audio_data, sr = sf.read(str(temp_raw_wav), dtype='float32')
        if audio_data.ndim == 1:
            # Duplicate mono to stereo
            audio = np.stack([audio_data, audio_data], axis=0)
        else:
            audio = audio_data.T # [2, samples]

        total_samples = audio.shape[1]
        duration_sec = round(total_samples / sr, 2)

        # 3. MDX-Net STFT Parameters
        N_FFT = 7680
        HOP_LENGTH = 1024
        DIM_F = 3072
        DIM_T = 256
        COMPENSATION = 1.021

        if progress_callback:
            progress_callback(25.0, "Computing multi-band STFT...")

        stft_l = librosa.stft(audio[0], n_fft=N_FFT, hop_length=HOP_LENGTH, window='hann', center=True)
        stft_r = librosa.stft(audio[1], n_fft=N_FFT, hop_length=HOP_LENGTH, window='hann', center=True)
        n_bins, n_frames = stft_l.shape

        interp, (in_idx, out_idx) = _get_interpreter()

        pred_stft_l = np.zeros_like(stft_l)
        pred_stft_r = np.zeros_like(stft_r)

        total_chunks = int(np.ceil(n_frames / DIM_T))
        
        # 4. Process frames in sliding windows of DIM_T (256 frames = ~5.9s)
        for chunk_idx, i in enumerate(range(0, n_frames, DIM_T)):
            chunk_l = stft_l[:DIM_F, i:i + DIM_T]
            chunk_r = stft_r[:DIM_F, i:i + DIM_T]
            actual_t = chunk_l.shape[1]

            if actual_t < DIM_T:
                chunk_l = np.pad(chunk_l, ((0, 0), (0, DIM_T - actual_t)))
                chunk_r = np.pad(chunk_r, ((0, 0), (0, DIM_T - actual_t)))

            inp = np.array([chunk_l.real, chunk_l.imag, chunk_r.real, chunk_r.imag], dtype=np.float32)
            inp = np.expand_dims(inp, axis=0) # [1, 4, 3072, 256]

            interp.set_tensor(in_idx, inp)
            interp.invoke()
            out = interp.get_tensor(out_idx)[0] # [4, 3072, 256]

            out_l = out[0, :, :actual_t] + 1j * out[1, :, :actual_t]
            out_r = out[2, :, :actual_t] + 1j * out[3, :, :actual_t]

            pred_stft_l[:DIM_F, i:i + actual_t] = out_l
            pred_stft_r[:DIM_F, i:i + actual_t] = out_r

            if progress_callback and total_chunks > 0:
                pct = 30.0 + (chunk_idx / total_chunks) * 50.0
                progress_callback(pct, f"Separating vocals ({chunk_idx + 1}/{total_chunks})...")

        if progress_callback:
            progress_callback(85.0, "Reconstructing clean instrumental soundtrack...")

        # 5. Inverse STFT to reconstruct Vocals
        voc_l = librosa.istft(pred_stft_l, n_fft=N_FFT, hop_length=HOP_LENGTH, window='hann', length=total_samples)
        voc_r = librosa.istft(pred_stft_r, n_fft=N_FFT, hop_length=HOP_LENGTH, window='hann', length=total_samples)
        vocals = np.stack([voc_l, voc_r], axis=0)

        # 6. Compute Instrumental (BGM + Sound Effects)
        instrumental = audio - (vocals * COMPENSATION)

        # Clip values safely
        vocals = np.clip(vocals, -1.0, 1.0)
        instrumental = np.clip(instrumental, -1.0, 1.0)

        if progress_callback:
            progress_callback(92.0, "Exporting audio tracks...")

        # 7. Write outputs to cache
        stem_name = Path(media_path).stem
        inst_filename = f"bgm_clean_{stem_name}_{uid}.mp3"
        voc_filename = f"vocals_{stem_name}_{uid}.mp3"
        
        temp_inst_wav = AUDIO_CACHE_DIR / f"temp_inst_{uid}.wav"
        temp_voc_wav = AUDIO_CACHE_DIR / f"temp_voc_{uid}.wav"

        sf.write(str(temp_inst_wav), instrumental.T, sr)
        sf.write(str(temp_voc_wav), vocals.T, sr)

        inst_mp3_path = AUDIO_CACHE_DIR / inst_filename
        voc_mp3_path = AUDIO_CACHE_DIR / voc_filename

        encode_audio_mp3(temp_inst_wav, inst_mp3_path)
        encode_audio_mp3(temp_voc_wav, voc_mp3_path)

        # Clean temporary wavs
        for f in [temp_inst_wav, temp_voc_wav]:
            try:
                if f.exists():
                    f.unlink()
            except Exception:
                pass

        if progress_callback:
            progress_callback(100.0, "Vocal separation complete!")

        return {
            "status": "success",
            "instrumental_filename": inst_filename,
            "instrumental_url": f"/api/audio/{inst_filename}",
            "vocals_filename": voc_filename,
            "vocals_url": f"/api/audio/{voc_filename}",
            "duration": duration_sec
        }

    finally:
        try:
            if temp_raw_wav.exists():
                temp_raw_wav.unlink()
        except Exception:
            pass

async def separate_audio_vocals(
    video_filename: str,
    progress_callback: Optional[Callable[[float, str], None]] = None
) -> Dict[str, Any]:
    """Asynchronous wrapper running CPU/XNNPACK separation in thread pool"""
    media_path = resolve_media_file(video_filename)
    return await asyncio.to_thread(separate_vocals_sync, media_path, progress_callback)

