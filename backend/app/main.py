import os
import sys
import shutil
import uuid
import asyncio
import subprocess
import urllib.parse
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from .config import UPLOADS_DIR, AUDIO_CACHE_DIR, EXPORTS_DIR, FFMPEG_PATH, FFPROBE_PATH, SUBPROCESS_FLAGS
from .models.subtitle import (
    SubtitleItem,
    SubtitleProject,
    TTSGenerateItemRequest,
    TTSBatchRequest,
    TranslationRequest,
    VideoBurnRequest,
    STTRequest,
    VocalSeparationRequest,
    VideoConcatRequest
)
from .services.subtitle_parser import (
    parse_subtitles_auto,
    export_srt,
    export_vtt,
    export_ass,
    auto_fix_overlaps
)
from .services.tts_engine import (
    get_all_voices,
    generate_speech_for_text,
    generate_batch_tts
)
from .services.translator import (
    translate_batch_gemini,
    translate_batch_google_free
)
from .services.whisper_stt import transcribe_video_whisper
from .services.vocal_separator import separate_audio_vocals
from .services.ffmpeg_runner import probe_video, render_and_burn_video, get_render_progress, concat_videos

app = FastAPI(
    title="mk_subtitle API",
    description="Studio backend for Subtitle Parsing, Whisper STT, AI Translation, Edge-TTS Dubbing & Video Hard-sub Burning",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/status")
async def get_system_status():
    return {
        "status": "ready",
        "app": "mk_subtitle",
        "ffmpeg": FFMPEG_PATH,
        "ffprobe": FFPROBE_PATH,
        "gpu_amf_available": True,
        "features": {
            "whisper_stt": True,
            "edge_tts": True,
            "gemini_translation": True,
            "google_free_translation": True,
            "amf_hardware_render": True
        }
    }

# ==================== Video & Audio Endpoints ====================

@app.post("/api/upload/video")
async def upload_video(file: UploadFile = File(...)):
    ext = Path(file.filename or "video.mp4").suffix
    unique_name = f"vid_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = UPLOADS_DIR / unique_name

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    metadata = await asyncio.to_thread(probe_video, dest_path)
    return {
        "filename": unique_name,
        "url": f"/api/video/{unique_name}",
        "name": file.filename,
        "metadata": metadata
    }

@app.post("/api/upload/bgm")
async def upload_bgm(file: UploadFile = File(...)):
    ext = Path(file.filename or "bgm.mp3").suffix
    unique_name = f"bgm_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = AUDIO_CACHE_DIR / unique_name

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "filename": unique_name,
        "url": f"/api/audio/{unique_name}",
        "name": file.filename
    }

@app.get("/api/video/{filename}")
async def serve_video(filename: str):
    path = UPLOADS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(path, media_type="video/mp4")

@app.get("/api/audio/{filename}")
async def serve_audio(filename: str):
    path = AUDIO_CACHE_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(path, media_type="audio/mpeg")

def _safe_remove(path: Path):
    try:
        if path.exists():
            path.unlink()
            print(f"Purged temporary file: {path.name}")
    except Exception as e:
        print(f"Error removing {path}: {e}")

@app.get("/api/exports/{filename}")
async def download_export(
    filename: str,
    delete_after: bool = False,
    background_tasks: BackgroundTasks = None
):
    unquoted = urllib.parse.unquote(filename)
    path = EXPORTS_DIR / unquoted
    if not path.exists():
        path = EXPORTS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Exported file not found")

    if delete_after and background_tasks:
        background_tasks.add_task(_safe_remove, path)

    return FileResponse(path, filename=path.name, media_type="video/mp4")

@app.post("/api/exports/open-folder")
async def open_exports_folder_endpoint():
    """Opens the exports directory in Windows File Explorer"""
    try:
        if sys.platform == "win32":
            subprocess.Popen(["explorer.exe", str(EXPORTS_DIR)], creationflags=SUBPROCESS_FLAGS)
            return {"status": "success", "path": str(EXPORTS_DIR)}
        return {"status": "unsupported"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Storage Management & Purging ====================

@app.get("/api/storage/usage")
async def get_storage_usage():
    def get_dir_stats(directory: Path):
        files = [f for f in directory.glob("*") if f.is_file() and not f.name.startswith(".gitkeep")]
        size_bytes = sum(f.stat().st_size for f in files)
        return {
            "count": len(files),
            "size_bytes": size_bytes,
            "size_mb": round(size_bytes / (1024 * 1024), 2)
        }

    uploads = get_dir_stats(UPLOADS_DIR)
    audio_cache = get_dir_stats(AUDIO_CACHE_DIR)
    exports = get_dir_stats(EXPORTS_DIR)
    total_bytes = uploads["size_bytes"] + audio_cache["size_bytes"] + exports["size_bytes"]

    return {
        "uploads": uploads,
        "audio_cache": audio_cache,
        "exports": exports,
        "total_mb": round(total_bytes / (1024 * 1024), 2)
    }

@app.post("/api/storage/clean")
async def clean_storage(
    clean_audio_cache: bool = True,
    clean_exports: bool = True,
    clean_uploads: bool = False
):
    deleted_count = 0
    freed_bytes = 0

    dirs_to_clean = []
    if clean_audio_cache:
        dirs_to_clean.append(AUDIO_CACHE_DIR)
    if clean_exports:
        dirs_to_clean.append(EXPORTS_DIR)
    if clean_uploads:
        dirs_to_clean.append(UPLOADS_DIR)

    for d in dirs_to_clean:
        for f in d.glob("*"):
            if f.is_file() and not f.name.startswith(".gitkeep"):
                try:
                    freed_bytes += f.stat().st_size
                    f.unlink()
                    deleted_count += 1
                except Exception as e:
                    print(f"Could not delete {f}: {e}")

    return {
        "status": "success",
        "deleted_count": deleted_count,
        "freed_mb": round(freed_bytes / (1024 * 1024), 2)
    }

# ==================== Subtitle Parsing & Editing ====================

@app.post("/api/upload/subtitles")
async def upload_subtitles(file: UploadFile = File(...)):
    raw_content = await file.read()
    # Decode with utf-8, fallback to utf-8-sig or latin-1
    try:
        content_str = raw_content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            content_str = raw_content.decode("utf-8-sig")
        except UnicodeDecodeError:
            content_str = raw_content.decode("latin-1")

    items = parse_subtitles_auto(content_str)
    return {
        "filename": file.filename,
        "total_items": len(items),
        "items": items
    }

@app.post("/api/subtitles/export")
async def export_subtitles(
    items: List[SubtitleItem] = Body(...),
    format: str = "srt",
    use_translation: bool = False
):
    fmt = format.lower()
    if fmt == "vtt":
        text = export_vtt(items, use_translated=use_translation)
        return PlainTextResponse(text, media_type="text/vtt")
    elif fmt == "ass":
        text = export_ass(items, use_translated=use_translation)
        return PlainTextResponse(text, media_type="text/plain")
    else:
        text = export_srt(items, use_translated=use_translation)
        return PlainTextResponse(text, media_type="text/plain")

@app.post("/api/subtitles/fix-overlaps")
async def fix_sub_overlaps(items: List[SubtitleItem] = Body(...)):
    fixed = auto_fix_overlaps(items)
    return {"items": fixed}

# ==================== Speech-to-Text (Whisper) ====================

@app.post("/api/transcribe")
async def transcribe_audio(req: STTRequest):
    try:
        items, detected_lang = await transcribe_video_whisper(
            video_filename=req.video_filename,
            model_size=req.model_size,
            language=req.language
        )
        
        # If auto-translate to Khmer is requested, translate batch
        if req.auto_translate_to_khmer and items:
            try:
                items = await translate_batch_google_free(
                    items=items,
                    source_lang="auto",
                    target_lang="km"
                )
            except Exception as e:
                print(f"Auto-translate after Whisper notice: {e}")

        return {
            "items": items,
            "total": len(items),
            "detected_language": detected_lang
        }
    except Exception as e:
        print(f"Whisper transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== UVR Vocal & Speech Separation ====================

@app.post("/api/audio/separate-vocals")
async def separate_vocals_endpoint(req: VocalSeparationRequest):
    try:
        res = await separate_audio_vocals(req.video_filename)
        return res
    except Exception as e:
        print(f"UVR separation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== AI Translation ====================

@app.post("/api/translate")
async def translate_subtitles(req: TranslationRequest):
    try:
        if req.provider == "gemini":
            translated = await translate_batch_gemini(
                req.items,
                source_lang=req.source_lang,
                target_lang=req.target_lang,
                api_key=req.gemini_api_key
            )
        else:
            translated = await translate_batch_google_free(
                req.items,
                source_lang=req.source_lang,
                target_lang=req.target_lang
            )
        return {"items": translated}
    except Exception as e:
        print(f"Translation API error: {e}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

# ==================== Text-to-Speech (Edge-TTS) ====================

@app.get("/api/tts/voices")
async def list_voices():
    voices = await get_all_voices()
    return {"voices": voices}

@app.post("/api/tts/generate-item")
async def tts_single_item(req: TTSGenerateItemRequest):
    try:
        chosen_voice = req.voice
        if not chosen_voice:
            chosen_voice = "km-KH-PisethNeural" if req.gender == "Male" else "km-KH-SreymomNeural"
            
        res = await generate_speech_for_text(
            text=req.text,
            voice=chosen_voice,
            rate=req.rate,
            pitch=req.pitch,
            volume=req.volume,
            target_duration=req.target_duration,
            auto_fit=req.auto_fit
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")

@app.post("/api/tts/generate-batch")
@app.post("/api/tts/batch")
async def tts_batch(req: TTSBatchRequest):
    try:
        updated_items = await generate_batch_tts(
            items=req.items,
            use_translation=req.use_translation,
            voice_male=req.voice_male,
            voice_female=req.voice_female,
            rate=req.rate,
            pitch=req.pitch,
            volume=req.volume,
            auto_fit=req.auto_fit
        )
        return {"items": updated_items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch TTS error: {str(e)}")

# ==================== System & Local PC Fonts ====================

_CACHED_SYSTEM_FONTS = None

def get_system_installed_fonts():
    global _CACHED_SYSTEM_FONTS
    if _CACHED_SYSTEM_FONTS is not None:
        return _CACHED_SYSTEM_FONTS

    fonts = set()
    khmer_keywords = [
        "khmer", "kantumruy", "moul", "siemreap", "battambang", "leelawadee",
        "dangrek", "bokor", "chenla", "preah", "chrieng", "fasthand", "freehand",
        "koulen", "angkor", "bayon", "content", "muol", "akbalthom", "nida",
        "rotanak", "mondulkiri", "kampot", "kampong", "busra"
    ]

    # Windows registry fonts inspection
    if sys.platform == "win32":
        try:
            import winreg
            import re
            for root, key_path in [
                (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts"),
                (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts")
            ]:
                try:
                    with winreg.OpenKey(root, key_path) as key:
                        val_count = winreg.QueryInfoKey(key)[1]
                        for i in range(val_count):
                            val_name, _, _ = winreg.EnumValue(key, i)
                            clean_name = re.sub(r"\s*\([^)]*\)$", "", val_name).strip()
                            if "&" in clean_name:
                                for part in clean_name.split("&"):
                                    p = part.strip()
                                    if p:
                                        fonts.add(p)
                            elif clean_name:
                                fonts.add(clean_name)
                except Exception:
                    pass
        except Exception as e:
            print(f"Notice: Font detection error: {e}")

    # Fallback default fonts if registry returned nothing or on non-Windows
    default_khmer = [
        "Kantumruy Pro", "Kantumruy", "Khmer OS Siemreap", "Khmer OS Battambang",
        "Khmer OS Muol", "Khmer OS Content", "Khmer OS Bokor", "Khmer OS Dangrek",
        "Khmer OS Fasthand", "Khmer OS Freehand", "Leelawadee UI", "Noto Sans Khmer"
    ]
    for df in default_khmer:
        fonts.add(df)

    all_sorted = sorted(list(fonts), key=lambda s: s.lower())

    khmer_fonts = [
        f for f in all_sorted
        if any(kw in f.lower() for kw in khmer_keywords)
    ]
    # Priority favorites at top of list
    priority_khmer = [
        "Kantumruy Pro", "Khmer OS Siemreap", "Khmer OS Battambang",
        "Khmer OS Muol", "Khmer OS Content", "Leelawadee UI", "Battambang", "Moul"
    ]
    khmer_sorted = []
    for pk in priority_khmer:
        matches = [f for f in khmer_fonts if f.lower() == pk.lower()]
        if matches and matches[0] not in khmer_sorted:
            khmer_sorted.append(matches[0])
    for f in khmer_fonts:
        if f not in khmer_sorted:
            khmer_sorted.append(f)

    popular_system = [
        "Arial", "Segoe UI", "Tahoma", "Calibri", "Impact",
        "Trebuchet MS", "Verdana", "Times New Roman"
    ]
    popular_found = [f for f in popular_system if f in fonts]

    _CACHED_SYSTEM_FONTS = {
        "khmer": khmer_sorted,
        "popular": popular_found or popular_system,
        "all": all_sorted,
        "total_count": len(all_sorted),
        "khmer_count": len(khmer_sorted)
    }
    return _CACHED_SYSTEM_FONTS

@app.get("/api/system/fonts")
async def get_system_fonts_endpoint():
    """Returns fonts installed locally on this PC, categorized for subtitle rendering."""
    return get_system_installed_fonts()

# ==================== Video Rendering & Burning ====================

@app.get("/api/render/progress/{job_id}")
async def get_render_progress_endpoint(job_id: str):
    """Returns real-time render percentage progress for the specified job_id"""
    return get_render_progress(job_id)

@app.post("/api/render/burn")
async def burn_video_endpoint(req: VideoBurnRequest, background_tasks: BackgroundTasks):
    try:
        # Extra safety check: if dubbing is requested, make sure all items have valid audio on disk!
        if req.include_dubbing and req.items:
            def audio_file_exists(it):
                if not it.audio_url:
                    return False
                fname = Path(str(it.audio_url).split("?")[0]).name
                return (AUDIO_CACHE_DIR / fname).exists() or (UPLOADS_DIR / fname).exists()

            missing_audio_items = [it for it in req.items if not audio_file_exists(it)]
            if missing_audio_items:
                print(f"Notice: include_dubbing=True but {len(missing_audio_items)}/{len(req.items)} items lack audio on disk. Auto-generating Edge-TTS...")
                generated = await generate_batch_tts(
                    items=missing_audio_items,
                    use_translation=req.use_translation,
                    auto_fit=True
                )
                gen_lookup = {it.id: it for it in generated}
                req.items = [gen_lookup.get(it.id, it) for it in req.items]

        # Run render non-blockingly in background threadpool to keep server fast and smooth
        export_filename = await asyncio.to_thread(render_and_burn_video, req)
        return {
            "status": "success",
            "export_filename": export_filename,
            "download_url": f"/api/exports/{urllib.parse.quote(export_filename)}"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Burn render failed: {str(e)}")

@app.post("/api/render/concat")
async def concat_videos_endpoint(req: VideoConcatRequest):
    try:
        if not req.video_filenames:
            raise HTTPException(status_code=400, detail="No video filenames provided for concatenation.")
        export_filename = await asyncio.to_thread(
            concat_videos,
            req.video_filenames,
            req.custom_output_filename,
            req.job_id
        )
        return {
            "status": "success",
            "export_filename": export_filename,
            "download_url": f"/api/exports/{urllib.parse.quote(export_filename)}"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Video concatenation failed: {str(e)}")

# Mount frontend build static directory if present
if getattr(sys, 'frozen', False):
    frontend_dist = Path(sys._MEIPASS) / "frontend" / "dist"
else:
    frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

