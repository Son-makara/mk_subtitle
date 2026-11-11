import os
import sys
import uuid
import subprocess
import asyncio
from pathlib import Path
from typing import List, Optional, Tuple
import numpy as np

from ..config import UPLOADS_DIR, AUDIO_CACHE_DIR, FFMPEG_PATH, SUBPROCESS_FLAGS
from ..models.subtitle import SubtitleItem

# Lazy-loaded whisper model cache
_WHISPER_MODELS = {}

def resolve_media_file(filename: Optional[str] = None) -> Path:
    """
    Robustly resolves a video or audio file by:
    1. Exact filename in UPLOADS_DIR or AUDIO_CACHE_DIR
    2. Stripping URL prefixes (/api/video/, /api/audio/)
    3. Stem / case-insensitive match
    4. Fallback to the single uploaded video or most recently uploaded media
    """
    if filename:
        candidate = Path(filename)
        if candidate.is_file() and candidate.exists():
            return candidate

        clean_name = Path(str(filename).replace("/api/video/", "").replace("/api/audio/", "").split("?")[0]).name

        for d in [UPLOADS_DIR, AUDIO_CACHE_DIR]:
            p = d / clean_name
            if p.exists():
                return p

        # Check stem match
        target_stem = Path(clean_name).stem.lower()
        for directory in [UPLOADS_DIR, AUDIO_CACHE_DIR]:
            for f in directory.glob("*"):
                if f.is_file() and not f.name.startswith(".gitkeep"):
                    if f.name.lower() == clean_name.lower() or f.stem.lower() == target_stem:
                        return f

    # Fallback to single or most recent file in uploads
    all_uploads = [f for f in UPLOADS_DIR.glob("*") if f.is_file() and not f.name.startswith(".gitkeep")]
    if all_uploads:
        all_uploads.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        return all_uploads[0]

    # Fallback to any audio in audio_cache
    all_cache = [f for f in AUDIO_CACHE_DIR.glob("*") if f.is_file() and not f.name.startswith(".gitkeep") and f.suffix.lower() in [".mp3", ".wav", ".m4a", ".aac"]]
    if all_cache:
        all_cache.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        return all_cache[0]

    raise FileNotFoundError(f"Media file '{filename or 'unknown'}' not found in uploads or audio cache.")

def extract_audio_for_whisper(video_path: Path, output_wav: Path) -> bool:
    """Extracts 16kHz mono audio optimized for Whisper STT and voice pitch analysis"""
    cmd = [
        FFMPEG_PATH, "-y",
        "-i", str(video_path),
        "-vn",
        "-threads", "0",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        str(output_wav)
    ]
    res = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=SUBPROCESS_FLAGS
    )
    return res.returncode == 0

def detect_voice_gender(audio_segment: np.ndarray, sr: int = 16000) -> str:
    """
    Analyzes audio segment fundamental frequency (F0) to classify Male vs Female voice.
    - Male pitch: typically 85 Hz - 165 Hz (average ~120 Hz)
    - Female pitch: typically 165 Hz - 280 Hz (average ~210 Hz)
    """
    try:
        if len(audio_segment) < int(sr * 0.15):  # Too short (<150ms)
            return "Female"

        # Ensure mono float32
        if audio_segment.ndim > 1:
            audio_segment = np.mean(audio_segment, axis=1)
        audio = audio_segment.astype(np.float32)
        max_val = np.max(np.abs(audio))
        if max_val > 1e-4:
            audio = audio / max_val
        else:
            return "Female"

        # Bandpass filter for human vocal fundamental range (70 Hz to 350 Hz)
        import scipy.signal
        sos = scipy.signal.butter(4, [70, 350], btype="bandpass", fs=sr, output="sos")
        filtered = scipy.signal.sosfilt(sos, audio)

        frame_len = int(sr * 0.05)   # 50ms frame
        hop_len = int(sr * 0.025)    # 25ms step
        min_lag = int(sr / 320)      # ~50 samples for 320 Hz
        max_lag = int(sr / 75)       # ~213 samples for 75 Hz

        pitches = []
        energy_threshold = 0.02 * np.mean(np.abs(filtered))

        for start in range(0, len(filtered) - frame_len, hop_len):
            frame = filtered[start : start + frame_len]
            if np.mean(frame ** 2) < energy_threshold:
                continue

            ac = np.correlate(frame, frame, mode="full")[frame_len - 1 :]
            if max_lag < len(ac) and ac[0] > 0:
                search_win = ac[min_lag:max_lag]
                if len(search_win) > 0:
                    peak_idx = min_lag + int(np.argmax(search_win))
                    peak_corr = ac[peak_idx] / ac[0]
                    if peak_corr > 0.30:  # Voiced harmonic confidence
                        f0 = sr / peak_idx
                        pitches.append(f0)

        if not pitches:
            ac = np.correlate(filtered, filtered, mode="full")[len(filtered) - 1 :]
            if max_lag < len(ac) and ac[0] > 0:
                search_win = ac[min_lag:max_lag]
                if len(search_win) > 0:
                    peak_idx = min_lag + int(np.argmax(search_win))
                    f0 = sr / peak_idx
                    return "Female" if f0 >= 165.0 else "Male"
            return "Female"

        median_pitch = float(np.median(pitches))
        return "Female" if median_pitch >= 165.0 else "Male"
    except Exception as e:
        print(f"Gender detection notice: {e}")
        return "Female"

def _ensure_whisper_assets_patched():
    """Ensures Whisper finds mel_filters.npz and tiktoken assets in both dev and PyInstaller frozen modes"""
    import whisper.audio
    import whisper.tokenizer
    import torch
    from ..config import BASE_DIR

    candidate_asset_dirs = [
        os.path.join(os.path.dirname(whisper.__file__), "assets"),
        os.path.join(str(BASE_DIR), "_internal", "whisper", "assets"),
        os.path.join(str(BASE_DIR), "whisper", "assets"),
        os.path.join(getattr(sys, "_MEIPASS", ""), "whisper", "assets")
    ]

    valid_asset_dir = None
    for d in candidate_asset_dirs:
        if d and os.path.exists(os.path.join(d, "mel_filters.npz")):
            valid_asset_dir = d
            break

    orig_mel = whisper.audio.mel_filters

    def robust_mel_filters(device, n_mels: int):
        try:
            return orig_mel(device, n_mels)
        except (FileNotFoundError, OSError):
            if valid_asset_dir:
                p = os.path.join(valid_asset_dir, "mel_filters.npz")
                with np.load(p, allow_pickle=False) as f:
                    return torch.from_numpy(f[f"mel_{n_mels}"]).to(device)
            import librosa
            weights = librosa.filters.mel(sr=16000, n_fft=400, n_mels=n_mels)
            return torch.from_numpy(weights).to(device)

    whisper.audio.mel_filters = robust_mel_filters

    orig_get_encoding = whisper.tokenizer.get_encoding

    def robust_get_encoding(name: str = "gpt2", num_languages: int = 99):
        try:
            return orig_get_encoding(name=name, num_languages=num_languages)
        except (FileNotFoundError, OSError):
            if valid_asset_dir:
                vocab_path = os.path.join(valid_asset_dir, f"{name}.tiktoken")
                if os.path.exists(vocab_path):
                    import base64, tiktoken
                    from whisper.tokenizer import LANGUAGES
                    ranks = {
                        base64.b64decode(token): int(rank)
                        for token, rank in (line.split() for line in open(vocab_path, "r", encoding="utf-8") if line)
                    }
                    n_vocab = len(ranks)
                    special_tokens = {}
                    specials = [
                        "<|endoftext|>",
                        "<|startoftranscript|>",
                        *[f"<|{lang}|>" for lang in list(LANGUAGES.keys())[:num_languages]],
                        "<|translate|>",
                        "<|transcribe|>",
                        "<|startoflm|>",
                        "<|startofprev|>",
                        "<|nospeech|>",
                        "<|notimestamps|>",
                        *[f"<|{i * 0.02:.2f}|>" for i in range(1501)],
                    ]
                    for token in specials:
                        special_tokens[token] = n_vocab
                        n_vocab += 1
                    return tiktoken.Encoding(
                        name=os.path.basename(vocab_path),
                        explicit_n_vocab=n_vocab,
                        pat_str=r"""'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+""",
                        mergeable_ranks=ranks,
                        special_tokens=special_tokens,
                    )
            raise

    whisper.tokenizer.get_encoding = robust_get_encoding

def run_whisper_transcribe_sync(
    audio_path: str,
    model_size: str = "base",
    language: Optional[str] = None
) -> Tuple[List[SubtitleItem], str]:
    import whisper
    _ensure_whisper_assets_patched()

    global _WHISPER_MODELS
    chosen_model = model_size if model_size in ["tiny", "base", "small", "medium"] else "base"
    
    if chosen_model not in _WHISPER_MODELS:
        print(f"Loading Whisper model '{chosen_model}' onto CPU...")
        try:
            _WHISPER_MODELS[chosen_model] = whisper.load_model(chosen_model, device="cpu")
        except Exception as e:
            print(f"Failed to load '{chosen_model}' ({e}), falling back to 'base'...")
            chosen_model = "base"
            if "base" not in _WHISPER_MODELS:
                _WHISPER_MODELS["base"] = whisper.load_model("base", device="cpu")

    model = _WHISPER_MODELS[chosen_model]
    
    transcribe_options = {"task": "transcribe", "fp16": False}
    if language and language != "auto":
        transcribe_options["language"] = language

    # Read extracted audio for voice pitch / gender classification
    full_audio = None
    sample_rate = 16000
    try:
        import soundfile as sf
        full_audio, sample_rate = sf.read(audio_path)
    except Exception as e:
        print(f"Warning: could not read audio for gender classification: {e}")

    # Transcribe with word timestamps for tight, accurate voice synchronization
    try:
        result = model.transcribe(audio_path, word_timestamps=True, **transcribe_options)
    except Exception as e:
        print(f"Notice: Whisper word_timestamps fallback ({e})")
        result = model.transcribe(audio_path, **transcribe_options)

    detected_language = result.get("language", language or "auto")
    
    items = []
    segments = result.get("segments", [])
    for idx, seg in enumerate(segments, 1):
        txt = seg.get("text", "").strip()
        if not txt:
            continue

        # Use exact word boundary timestamps when available to synchronize voice on video
        words = seg.get("words", [])
        if words and len(words) > 0:
            start_t = round(float(words[0].get("start", seg.get("start", 0.0))), 3)
            end_t = round(float(words[-1].get("end", seg.get("end", 0.0))), 3)
        else:
            start_t = round(float(seg.get("start", 0.0)), 3)
            end_t = round(float(seg.get("end", 0.0)), 3)

        if end_t <= start_t:
            end_t = round(start_t + 0.8, 3)

        # Detect voice gender (Male / Female) from the audio segment
        detected_gender = "Female"
        if full_audio is not None and len(full_audio) > 0:
            idx_start = max(0, int(start_t * sample_rate))
            idx_end = min(len(full_audio), int(end_t * sample_rate))
            if idx_end > idx_start:
                slice_audio = full_audio[idx_start:idx_end]
                detected_gender = detect_voice_gender(slice_audio, sample_rate)

        items.append(
            SubtitleItem(
                id=str(uuid.uuid4())[:8],
                index=idx,
                start_time=start_t,
                end_time=end_t,
                text=txt,
                gender=detected_gender,
                speaker=f"{detected_gender} Speaker",
            )
        )
    return items, detected_language

async def transcribe_video_whisper(
    video_filename: Optional[str] = None,
    model_size: str = "base",
    language: Optional[str] = None
):
    video_path = resolve_media_file(video_filename)

    temp_wav = AUDIO_CACHE_DIR / f"stt_temp_{uuid.uuid4().hex[:8]}.wav"
    try:
        loop = asyncio.get_event_loop()
        extracted = await loop.run_in_executor(None, extract_audio_for_whisper, video_path, temp_wav)
        if not extracted or not temp_wav.exists():
            raise RuntimeError(f"Failed to extract audio stream from {video_path.name}.")

        items, detected_lang = await loop.run_in_executor(
            None, run_whisper_transcribe_sync, str(temp_wav), model_size, language
        )
        return items, detected_lang
    finally:
        if temp_wav.exists():
            try:
                os.remove(temp_wav)
            except Exception:
                pass
