import os
import uuid
import subprocess
import asyncio
from pathlib import Path
from typing import List, Optional

from ..config import UPLOADS_DIR, AUDIO_CACHE_DIR, FFMPEG_PATH
from ..models.subtitle import SubtitleItem

# Lazy-loaded whisper model cache
_WHISPER_MODELS = {}

def resolve_media_file(filename: Optional[str] = None) -> Path:
    """
    Robustly resolves a video or audio file by:
    1. Exact filename in UPLOADS_DIR or AUDIO_CACHE_DIR
    2. Stem / case-insensitive match
    3. Fallback to the single uploaded video or most recently uploaded media
    """
    if filename:
        candidate = Path(filename)
        if candidate.is_file() and candidate.exists():
            return candidate

        p1 = UPLOADS_DIR / filename
        if p1.exists():
            return p1

        p2 = AUDIO_CACHE_DIR / filename
        if p2.exists():
            return p2

        # Check stem match
        target_stem = Path(filename).stem.lower()
        for directory in [UPLOADS_DIR, AUDIO_CACHE_DIR]:
            for f in directory.glob("*"):
                if f.is_file() and not f.name.startswith(".gitkeep"):
                    if f.name.lower() == filename.lower() or f.stem.lower() == target_stem:
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
    """Extracts 16kHz mono audio optimized for Whisper STT"""
    cmd = [
        FFMPEG_PATH, "-y",
        "-i", str(video_path),
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        str(output_wav)
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return res.returncode == 0

def run_whisper_transcribe_sync(
    audio_path: str,
    model_size: str = "base",
    language: Optional[str] = None
):
    import whisper

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

    result = model.transcribe(audio_path, **transcribe_options)
    detected_language = result.get("language", language or "auto")
    
    items = []
    segments = result.get("segments", [])
    for idx, seg in enumerate(segments, 1):
        txt = seg.get("text", "").strip()
        if not txt:
            continue
        items.append(
            SubtitleItem(
                id=str(uuid.uuid4())[:8],
                index=idx,
                start_time=round(seg.get("start", 0.0), 3),
                end_time=round(seg.get("end", 0.0), 3),
                text=txt,
                speaker="Speaker",
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

