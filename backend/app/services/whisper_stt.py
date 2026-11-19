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

# Media directory search cache to track folders where user videos are located
KNOWN_MEDIA_DIRS = set()

def register_media_path(path_str: Optional[str]):
    if not path_str:
        return
    try:
        p = Path(path_str)
        if p.is_file():
            KNOWN_MEDIA_DIRS.add(p.parent)
        elif p.is_dir():
            KNOWN_MEDIA_DIRS.add(p)
    except Exception:
        pass

def resolve_media_file(filename: Optional[str] = None, require_video: bool = False) -> Path:
    """
    Robustly resolves a video or audio file by:
    1. Direct file path on disk (absolute or relative)
    2. Exact filename or stem in UPLOADS_DIR or AUDIO_CACHE_DIR
    3. Stripping URL prefixes (/api/video/, /api/audio/)
    4. Substring / fuzzy stem match in uploads (e.g. vid_<uuid>_<original_stem>.mp4)
    5. Searching in known media directories and common media folders on the host disk
    6. Fallback to single or most recent video in uploads (never audio if require_video=True)
    """
    valid_video_exts = {".mp4", ".mkv", ".mov", ".avi", ".webm", ".flv", ".m4v", ".ts"}
    is_video_query = require_video or (filename and Path(str(filename).split("?")[0]).suffix.lower() in valid_video_exts)

    if filename:
        candidate = Path(filename)
        if candidate.is_file() and candidate.exists():
            if not is_video_query or candidate.suffix.lower() in valid_video_exts:
                register_media_path(str(candidate))
                return candidate

        clean_name = Path(str(filename).replace("/api/video/", "").replace("/api/audio/", "").split("?")[0]).name
        clean_stem = Path(clean_name).stem.lower()

        search_storage_dirs = [UPLOADS_DIR] if is_video_query else [UPLOADS_DIR, AUDIO_CACHE_DIR]

        # 1. Exact match in standard storage dirs
        for d in search_storage_dirs:
            p = d / clean_name
            if p.exists() and p.is_file():
                if not is_video_query or p.suffix.lower() in valid_video_exts:
                    return p

        # 2. Check stem / substring match in storage dirs (supports vid_<uuid>_<stem>.ext)
        for directory in search_storage_dirs:
            for f in directory.glob("*"):
                if f.is_file() and not f.name.startswith(".gitkeep"):
                    if is_video_query and f.suffix.lower() not in valid_video_exts:
                        continue
                    f_name_lower = f.name.lower()
                    f_stem_lower = f.stem.lower()
                    if f_name_lower == clean_name.lower() or f_stem_lower == clean_stem:
                        return f
                    if clean_stem and (clean_stem in f_stem_lower or f_stem_lower in clean_stem):
                        return f

        # 3. Check known external media directories and host media drives on disk
        candidate_dirs = list(KNOWN_MEDIA_DIRS)
        for host_dir in [Path("D:/Media Video"), Path("D:/Media Video/Hongguo"), Path.home() / "Videos"]:
            if host_dir.exists() and host_dir.is_dir() and host_dir not in candidate_dirs:
                candidate_dirs.append(host_dir)

        for d in candidate_dirs:
            if d.exists() and d.is_dir():
                # Direct check
                p = d / clean_name
                if p.exists() and p.is_file():
                    if not is_video_query or p.suffix.lower() in valid_video_exts:
                        register_media_path(str(p))
                        return p
                # Check immediate files in folder
                for f in d.glob("*"):
                    if f.is_file():
                        if is_video_query and f.suffix.lower() not in valid_video_exts:
                            continue
                        if f.name.lower() == clean_name.lower() or f.stem.lower() == clean_stem:
                            register_media_path(str(f))
                            return f
                # Check one level deep subfolders (e.g. D:/Media Video/Series_Name/Episode 091.mp4)
                try:
                    for sub in d.iterdir():
                        if sub.is_dir():
                            sub_p = sub / clean_name
                            if sub_p.exists() and sub_p.is_file():
                                if not is_video_query or sub_p.suffix.lower() in valid_video_exts:
                                    register_media_path(str(sub_p))
                                    return sub_p
                            for f in sub.glob("*"):
                                if f.is_file():
                                    if is_video_query and f.suffix.lower() not in valid_video_exts:
                                        continue
                                    if f.name.lower() == clean_name.lower() or f.stem.lower() == clean_stem:
                                        register_media_path(str(f))
                                        return f
                except Exception:
                    pass

    # Fallback to single or most recent video in uploads
    all_uploads = [f for f in UPLOADS_DIR.glob("*") if f.is_file() and not f.name.startswith(".gitkeep") and f.suffix.lower() in valid_video_exts]
    if all_uploads:
        all_uploads.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        return all_uploads[0]

    # Audio fallback ONLY allowed if not a video query
    if not is_video_query:
        all_cache = [f for f in AUDIO_CACHE_DIR.glob("*") if f.is_file() and not f.name.startswith(".gitkeep") and f.suffix.lower() in [".mp3", ".wav", ".m4a", ".aac"]]
        if all_cache:
            all_cache.sort(key=lambda x: x.stat().st_mtime, reverse=True)
            return all_cache[0]

    raise FileNotFoundError(f"Video file '{filename or 'unknown'}' not found on server or disk. Please select or upload the video.")

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
    import shutil
    from ..config import BASE_DIR

    app_root = Path(__file__).resolve().parents[3]
    exe_dir = Path(sys.executable).parent

    candidate_asset_dirs = [
        os.path.join(os.path.dirname(whisper.__file__), "assets"),
        str(BASE_DIR / "models" / "whisper" / "assets"),
        str(BASE_DIR / "_internal" / "whisper" / "assets"),
        str(BASE_DIR / "whisper" / "assets"),
        str(exe_dir / "models" / "whisper" / "assets"),
        str(exe_dir / "_internal" / "whisper" / "assets"),
        str(app_root / "models" / "whisper" / "assets"),
        str(app_root / "dist" / "MK-Subtitle-Studio" / "_internal" / "whisper" / "assets"),
        str(app_root / "dist" / "MK-Subtitle-Studio" / "models" / "whisper" / "assets"),
        r"D:\Coding\mk_subtitle\models\whisper\assets",
        r"D:\Coding\mk_subtitle\dist\MK-Subtitle-Studio\_internal\whisper\assets",
        r"C:\Users\Makara-Network\AppData\Local\Programs\Python\Python313\Lib\site-packages\whisper\assets",
        r"C:\Users\Makara-Network\AppData\Local\Python\bin\Lib\site-packages\whisper\assets",
        os.path.join(getattr(sys, "_MEIPASS", ""), "whisper", "assets"),
        os.path.join(getattr(sys, "_MEIPASS", ""), "_internal", "whisper", "assets"),
    ]

    try:
        import site
        for sp in site.getsitepackages():
            candidate_asset_dirs.append(os.path.join(sp, "whisper", "assets"))
    except Exception:
        pass

    valid_asset_dir = None
    for d in candidate_asset_dirs:
        if d and os.path.exists(d):
            if os.path.exists(os.path.join(d, "multilingual.tiktoken")) or os.path.exists(os.path.join(d, "mel_filters.npz")):
                valid_asset_dir = d
                break

    # AUTO-HEALING: If valid_asset_dir is found, copy missing assets to whisper's module directory and _internal
    if valid_asset_dir:
        target_dirs = [
            os.path.join(os.path.dirname(whisper.__file__), "assets"),
            str(BASE_DIR / "_internal" / "whisper" / "assets"),
            str(exe_dir / "_internal" / "whisper" / "assets"),
            str(BASE_DIR / "models" / "whisper" / "assets"),
        ]
        for target_dir in target_dirs:
            try:
                if target_dir and os.path.abspath(target_dir) != os.path.abspath(valid_asset_dir):
                    os.makedirs(target_dir, exist_ok=True)
                    for item in os.listdir(valid_asset_dir):
                        src_item = os.path.join(valid_asset_dir, item)
                        dst_item = os.path.join(target_dir, item)
                        if os.path.isfile(src_item) and not os.path.exists(dst_item):
                            try:
                                shutil.copy2(src_item, dst_item)
                            except Exception:
                                pass
            except Exception:
                pass

    orig_mel = whisper.audio.mel_filters

    def robust_mel_filters(device, n_mels: int):
        try:
            return orig_mel(device, n_mels)
        except Exception:
            search_dirs = [valid_asset_dir] if valid_asset_dir else []
            search_dirs.extend([
                os.path.join(os.path.dirname(whisper.__file__), "assets"),
                str(BASE_DIR / "models" / "whisper" / "assets"),
                str(BASE_DIR / "_internal" / "whisper" / "assets"),
                str(exe_dir / "_internal" / "whisper" / "assets"),
                r"D:\Coding\mk_subtitle\models\whisper\assets",
                r"D:\Coding\mk_subtitle\dist\MK-Subtitle-Studio\_internal\whisper\assets",
                r"C:\Users\Makara-Network\AppData\Local\Programs\Python\Python313\Lib\site-packages\whisper\assets",
            ])
            for d in search_dirs:
                if d and os.path.exists(d):
                    p = os.path.join(d, "mel_filters.npz")
                    if os.path.exists(p):
                        with np.load(p, allow_pickle=False) as f:
                            return torch.from_numpy(f[f"mel_{n_mels}"]).to(device)
            try:
                import librosa
                weights = librosa.filters.mel(sr=16000, n_fft=400, n_mels=n_mels)
                return torch.from_numpy(weights).to(device)
            except Exception:
                raise

    whisper.audio.mel_filters = robust_mel_filters

    orig_get_encoding = whisper.tokenizer.get_encoding

    def robust_get_encoding(name: str = "gpt2", num_languages: int = 99):
        try:
            return orig_get_encoding(name=name, num_languages=num_languages)
        except Exception:
            search_dirs = [valid_asset_dir] if valid_asset_dir else []
            search_dirs.extend([
                os.path.join(os.path.dirname(whisper.__file__), "assets"),
                str(BASE_DIR / "models" / "whisper" / "assets"),
                str(BASE_DIR / "..", "models", "whisper", "assets"),
                str(BASE_DIR / "_internal" / "whisper" / "assets"),
                str(exe_dir / "_internal" / "whisper" / "assets"),
                r"D:\Coding\mk_subtitle\models\whisper\assets",
                r"D:\Coding\mk_subtitle\dist\MK-Subtitle-Studio\_internal\whisper\assets",
                r"C:\Users\Makara-Network\AppData\Local\Programs\Python\Python313\Lib\site-packages\whisper\assets",
            ])
            for d in search_dirs:
                if d and os.path.exists(d):
                    vocab_path = os.path.join(d, f"{name}.tiktoken")
                    if os.path.exists(vocab_path):
                        try:
                            wh_target = os.path.join(os.path.dirname(whisper.__file__), "assets", f"{name}.tiktoken")
                            if not os.path.exists(wh_target):
                                os.makedirs(os.path.dirname(wh_target), exist_ok=True)
                                shutil.copy2(vocab_path, wh_target)
                        except Exception:
                            pass

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
            try:
                import tiktoken
                return tiktoken.get_encoding("cl100k_base" if name != "gpt2" else "gpt2")
            except Exception:
                raise

    whisper.tokenizer.get_encoding = robust_get_encoding

# Cached faster-whisper models
_FASTER_WHISPER_MODELS = {}

def _patch_av_open():
    """Patches av.open to gracefully handle PyAV 19+ metadata_errors keyword removal"""
    try:
        import importlib
        av = importlib.import_module("av")
        if not getattr(av, "_mk_patched", False):
            orig_av_open = av.open
            def robust_av_open(*args, **kwargs):
                try:
                    return orig_av_open(*args, **kwargs)
                except TypeError as err:
                    if "metadata_errors" in kwargs or "metadata_errors" in str(err):
                        kwargs.pop("metadata_errors", None)
                        return orig_av_open(*args, **kwargs)
                    raise
            av.open = robust_av_open
            av._mk_patched = True
    except Exception:
        pass

def run_faster_whisper_transcribe_sync(
    audio_path: str,
    model_size: str = "base",
    language: Optional[str] = None
) -> Tuple[List[SubtitleItem], str]:
    """
    High-speed CTranslate2-based Whisper transcription (4x faster, lower memory,
    with Silero VAD noise filtering and automatic CUDA / INT8 CPU acceleration).
    """
    _patch_av_open()
    try:
        import importlib
        _fw_module = importlib.import_module("faster_whisper")
        WhisperModel = getattr(_fw_module, "WhisperModel")
        ctranslate2 = importlib.import_module("ctranslate2")
    except (ImportError, ModuleNotFoundError, Exception) as imp_err:
        print(f"Notice: faster-whisper not installed or failed to import ({imp_err}), falling back to standard Whisper...")
        return _run_standard_whisper_sync(audio_path, model_size, language)

    global _FASTER_WHISPER_MODELS
    chosen_model = model_size if model_size in ["tiny", "base", "small", "medium", "large-v3"] else "base"

    try:
        has_cuda = ctranslate2.get_cuda_device_count() > 0
    except Exception:
        has_cuda = False

    device = "cuda" if has_cuda else "cpu"
    compute_type = "float16" if has_cuda else "int8"
    cache_key = f"{chosen_model}_{device}_{compute_type}"

    try:
        if cache_key not in _FASTER_WHISPER_MODELS:
            print(f"Loading faster-whisper model '{chosen_model}' on {device} ({compute_type})...")
            _FASTER_WHISPER_MODELS[cache_key] = WhisperModel(
                chosen_model,
                device=device,
                compute_type=compute_type,
                cpu_threads=max(1, (os.cpu_count() or 4) - 1)
            )
        model = _FASTER_WHISPER_MODELS[cache_key]
    except Exception as model_err:
        print(f"faster-whisper model load failed ({model_err}), falling back to standard Whisper...")
        return _run_standard_whisper_sync(audio_path, model_size, language)

    # Read extracted audio for voice pitch / gender classification
    full_audio = None
    sample_rate = 16000
    try:
        import soundfile as sf
        full_audio, sample_rate = sf.read(audio_path)
    except Exception as e:
        print(f"Warning: could not read audio for gender classification: {e}")

    lang_param = None if (not language or language == "auto") else language
    try:
        segments, info = model.transcribe(
            audio_path,
            language=lang_param,
            word_timestamps=True,
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )
    except Exception as tr_err:
        print(f"Notice: faster-whisper transcribe failed ({tr_err}), falling back to standard Whisper...")
        return _run_standard_whisper_sync(audio_path, model_size, language)

    detected_language = info.language or (language if language and language != "auto" else "auto")

    items = []
    idx = 1
    for seg in segments:
        txt = (seg.text or "").strip()
        if not txt:
            continue

        words = getattr(seg, "words", None)
        if words and len(words) > 0:
            start_t = round(float(words[0].start), 3)
            end_t = round(float(words[-1].end), 3)
        else:
            start_t = round(float(seg.start), 3)
            end_t = round(float(seg.end), 3)

        if end_t <= start_t:
            end_t = round(start_t + 0.8, 3)

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
        idx += 1

    return items, detected_language

def _run_standard_whisper_sync(
    audio_path: str,
    model_size: str = "base",
    language: Optional[str] = None
) -> Tuple[List[SubtitleItem], str]:
    import whisper
    _ensure_whisper_assets_patched()

    global _WHISPER_MODELS
    chosen_model = model_size if model_size in ["tiny", "base", "small", "medium"] else "base"
    
    if chosen_model not in _WHISPER_MODELS:
        print(f"Loading standard Whisper model '{chosen_model}' onto CPU...")
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

        words = seg.get("words", [])
        if words and len(words) > 0:
            start_t = round(float(words[0].get("start", seg.get("start", 0.0))), 3)
            end_t = round(float(words[-1].get("end", seg.get("end", 0.0))), 3)
        else:
            start_t = round(float(seg.get("start", 0.0)), 3)
            end_t = round(float(seg.get("end", 0.0)), 3)

        if end_t <= start_t:
            end_t = round(start_t + 0.8, 3)

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

def run_whisper_transcribe_sync(
    audio_path: str,
    model_size: str = "base",
    language: Optional[str] = None,
    engine: str = "faster-whisper"
) -> Tuple[List[SubtitleItem], str]:
    """
    Transcribes audio using faster-whisper by default (4x faster CTranslate2)
    with seamless automatic fallback to standard OpenAI Whisper.
    """
    if engine == "faster-whisper":
        try:
            return run_faster_whisper_transcribe_sync(audio_path, model_size, language)
        except Exception as e:
            print(f"faster-whisper notice ({e}), falling back to standard Whisper...")

    return _run_standard_whisper_sync(audio_path, model_size, language)

async def transcribe_video_whisper(
    video_filename: Optional[str] = None,
    model_size: str = "base",
    language: Optional[str] = None,
    engine: str = "faster-whisper"
):
    try:
        _ensure_whisper_assets_patched()
    except Exception as e:
        print(f"Notice during whisper assets check: {e}")

    video_path = resolve_media_file(video_filename)

    temp_wav = AUDIO_CACHE_DIR / f"stt_temp_{uuid.uuid4().hex[:8]}.wav"
    try:
        loop = asyncio.get_event_loop()
        extracted = await loop.run_in_executor(None, extract_audio_for_whisper, video_path, temp_wav)
        if not extracted or not temp_wav.exists():
            raise RuntimeError(f"Failed to extract audio stream from {video_path.name}.")

        items, detected_lang = await loop.run_in_executor(
            None, run_whisper_transcribe_sync, str(temp_wav), model_size, language, engine
        )
        return items, detected_lang
    finally:
        if temp_wav.exists():
            try:
                os.remove(temp_wav)
            except Exception:
                pass
