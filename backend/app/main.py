import os
import sys
import shutil
import uuid
import re
import asyncio
import subprocess
import urllib.parse
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from .config import STORAGE_DIR, UPLOADS_DIR, AUDIO_CACHE_DIR, EXPORTS_DIR, FFMPEG_PATH, FFPROBE_PATH, SUBPROCESS_FLAGS
from .models.subtitle import (
    SubtitleItem,
    SubtitleProject,
    TTSGenerateItemRequest,
    TTSBatchRequest,
    TranslationRequest,
    VideoBurnRequest,
    STTRequest,
    VocalSeparationRequest,
    VideoConcatRequest,
    VideoSplitRequest,
    VideoSplitSegment,
    VideoMirrorRequest,
    OpenVlcRequest
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
    generate_batch_tts,
    is_mms_khmer_available
)
from .services.translator import (
    translate_batch_gemini,
    translate_batch_google_free,
    translate_batch_nllb_offline,
    is_nllb_available
)
from .services.whisper_stt import transcribe_video_whisper
from .services.vocal_separator import separate_audio_vocals
from .services.ffmpeg_runner import probe_video, render_and_burn_video, get_render_progress, concat_videos, split_video, render_mirror_video, resolve_video_file

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
async def upload_video(file: UploadFile = File(...), local_path: Optional[str] = Form(None)):
    from .services.whisper_stt import register_media_path
    
    # If a valid local disk path is provided (e.g. desktop PyWebView file), register it
    if local_path:
        local_p = Path(local_path)
        if local_p.is_file() and local_p.exists():
            register_media_path(str(local_p))

    raw_filename = file.filename or "video.mp4"
    ext = Path(raw_filename).suffix
    raw_stem = Path(raw_filename).stem
    # Sanitize stem for safe filename embedding
    safe_stem = re.sub(r'[^a-zA-Z0-9_\u4e00-\u9fff\u1780-\u17ff-]', '_', raw_stem)[:40]
    unique_name = f"vid_{uuid.uuid4().hex[:6]}_{safe_stem}{ext}"
    dest_path = UPLOADS_DIR / unique_name

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    register_media_path(str(dest_path))
    metadata = await asyncio.to_thread(probe_video, dest_path)

    # Universal VLC-like web compatibility:
    # If container is not MP4 (e.g. MKV, AVI, TS, FLV) or audio codec is not natively playable in Chromium (AC3, DTS, etc.)
    # create a fast remuxed MP4 (using -c:v copy which is near-instant, only converting audio to AAC)
    web_playable_name = unique_name
    ext_lower = ext.lower()
    audio_codec = (metadata.get("audio_codec") or "").lower()
    needs_remux = ext_lower in [".mkv", ".avi", ".ts", ".flv", ".wmv", ".webm", ".mov"] or audio_codec in ["ac3", "eac3", "dts", "dca", "truehd"]
    
    if needs_remux:
        web_name = f"web_{Path(unique_name).stem}.mp4"
        web_path = UPLOADS_DIR / web_name
        try:
            remux_cmd = [
                str(FFMPEG_PATH), "-y",
                "-i", str(dest_path),
                "-c:v", "copy",
                "-c:a", "aac", "-b:a", "192k",
                "-movflags", "+faststart",
                str(web_path)
            ]
            p = subprocess.run(remux_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, creationflags=SUBPROCESS_FLAGS, timeout=35)
            if p.returncode == 0 and web_path.exists() and web_path.stat().st_size > 1000:
                web_playable_name = web_name
                register_media_path(str(web_path))
        except Exception as ex:
            print(f"Web remux note: {ex}")

    return {
        "filename": unique_name,
        "url": f"/api/video/{web_playable_name}",
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

@app.post("/api/upload/logo")
async def upload_logo(file: UploadFile = File(...)):
    ext = Path(file.filename or "logo.png").suffix.lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp", ".svg"]:
        ext = ".png"
    unique_name = f"custom_logo_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = UPLOADS_DIR / unique_name

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "status": "success",
        "filename": unique_name,
        "url": f"/api/assets/{unique_name}",
        "name": file.filename
    }

@app.get("/api/assets/{filename}")
async def serve_asset(filename: str):
    from .config import BASE_DIR
    for d in [BASE_DIR / "assets", UPLOADS_DIR]:
        path = d / filename
        if path.exists() and path.is_file():
            ext = path.suffix.lower()
            media = "image/png" if ext == ".png" else "image/jpeg" if ext in [".jpg", ".jpeg"] else "image/webp" if ext == ".webp" else "application/octet-stream"
            return FileResponse(path, media_type=media)
    raise HTTPException(status_code=404, detail="Asset not found")

@app.get("/api/video/{filename}")
async def serve_video(filename: str):
    path = UPLOADS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    ext = path.suffix.lower()
    media_type = "video/mp4"
    if ext in [".png", ".jpg", ".jpeg", ".webp"]:
        media_type = f"image/{ext.replace('.', '')}"
    return FileResponse(path, media_type=media_type)

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

@app.get("/api/exports/list")
async def list_exports():
    """Lists rendered video files available in storage/exports"""
    files = []
    valid_exts = {".mp4", ".mkv", ".mov", ".ts", ".webm"}
    for f in sorted(EXPORTS_DIR.glob("*"), key=lambda x: x.stat().st_mtime, reverse=True):
        if f.is_file() and not f.name.startswith(".gitkeep") and f.suffix.lower() in valid_exts:
            size_mb = round(f.stat().st_size / (1024 * 1024), 2)
            files.append({
                "name": f.name,
                "filename": f.name,
                "size_mb": size_mb,
                "url": f"/api/exports/{urllib.parse.quote(f.name)}"
            })
    return {"files": files}

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

@app.post("/api/player/open-vlc")
async def open_vlc_endpoint(req: OpenVlcRequest):
    """Launches native VLC Media Player with the video and current subtitles"""
    try:
        vlc_candidates = [
            r"C:\Program Files\VideoLAN\VLC\vlc.exe",
            r"C:\Program Files (x86)\VideoLAN\VLC\vlc.exe",
            shutil.which("vlc") or ""
        ]
        vlc_bin = next((c for c in vlc_candidates if c and os.path.exists(c)), None)
        if not vlc_bin:
            return {
                "status": "not_installed",
                "message": "VLC Media Player was not found. Please install VLC from https://www.videolan.org/vlc/"
            }

        # Resolve video path on disk
        video_path = None
        if req.video_filename:
            for d in [UPLOADS_DIR, EXPORTS_DIR]:
                candidate = d / req.video_filename
                if candidate.exists() and candidate.is_file():
                    video_path = candidate
                    break
            if not video_path:
                from .services.whisper_stt import _MEDIA_REGISTRY
                if req.video_filename in _MEDIA_REGISTRY:
                    reg_p = Path(_MEDIA_REGISTRY[req.video_filename])
                    if reg_p.exists():
                        video_path = reg_p

        if not video_path or not video_path.exists():
            raise HTTPException(status_code=404, detail="Video file not found on disk.")

        cmd = [vlc_bin, str(video_path)]

        # If subtitles provided, write temporary .srt with UTF-8 BOM so VLC displays Khmer text properly
        if req.subtitles and len(req.subtitles) > 0:
            sub_text = export_srt(req.subtitles, use_translated=True)
            sub_file = AUDIO_CACHE_DIR / f"vlc_{uuid.uuid4().hex[:6]}.srt"
            with open(sub_file, "w", encoding="utf-8-sig") as f:
                f.write(sub_text)
            cmd.append(f"--sub-file={str(sub_file)}")

        subprocess.Popen(cmd)
        return {
            "status": "success",
            "message": "Opened video in VLC Media Player"
        }
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
            language=req.language,
            engine=getattr(req, "engine", "faster-whisper") or "faster-whisper"
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

@app.get("/api/offline/status")
async def get_offline_status():
    return {
        "status": "ready",
        "whisper_stt_offline": True,
        "mms_khmer_tts_offline": is_mms_khmer_available(),
        "nllb_translation_offline": is_nllb_available()
    }

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
        elif req.provider in ["nllb", "nllb_offline", "offline"]:
            translated = await translate_batch_nllb_offline(
                req.items,
                source_lang=req.source_lang,
                target_lang=req.target_lang
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

# ==================== Text-to-Speech (Edge-TTS & Meta MMS Offline) ====================

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
            auto_fit=req.auto_fit,
            engine=getattr(req, "engine", "edge-tts") or "edge-tts",
            gender=req.gender or "Female"
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
            auto_fit=req.auto_fit,
            engine=getattr(req, "engine", "edge-tts") or "edge-tts"
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
        try:
            with open(STORAGE_DIR / "last_burn_req.json", "w", encoding="utf-8") as f_req:
                f_req.write(req.model_dump_json(indent=2))
        except Exception:
            pass
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

        # Dynamically reload services to ensure latest resolver, filter pipelines and GPU flags are active
        from .services import whisper_stt, ffmpeg_runner
        import importlib
        importlib.reload(whisper_stt)
        importlib.reload(ffmpeg_runner)
        export_filename = await asyncio.to_thread(ffmpeg_runner.render_and_burn_video, req)
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

@app.post("/api/render/split")
async def split_video_endpoint(req: VideoSplitRequest):
    try:
        if not req.video_filename:
            raise HTTPException(status_code=400, detail="No video filename provided.")
        if not req.segments:
            raise HTTPException(status_code=400, detail="No segments provided for splitting.")
        results = await asyncio.to_thread(
            split_video,
            req.video_filename,
            req.segments,
            req.job_id
        )
        return {
            "status": "success",
            "results": results
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Video splitting failed: {str(e)}")

@app.post("/api/render/mirror")
async def mirror_video_endpoint(req: VideoMirrorRequest):
    try:
        if not req.video_filename:
            raise HTTPException(status_code=400, detail="No video filename provided.")
        result = await asyncio.to_thread(
            render_mirror_video,
            video_filename=req.video_filename,
            mirror_horizontal=req.mirror_horizontal,
            flip_vertical=req.flip_vertical,
            rotate_angle=req.rotate_angle,
            use_gpu=req.use_amf_gpu,
            custom_output_filename=req.custom_output_filename,
            job_id=req.job_id
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Video mirror failed: {str(e)}")

@app.get("/api/video/probe")
async def probe_video_endpoint(filename: str):
    try:
        fpath = resolve_video_file(filename)
        metadata = await asyncio.to_thread(probe_video, fpath)
        return {
            "status": "success",
            "filename": fpath.name,
            "metadata": metadata
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Video probe failed: {str(e)}")

# Mount frontend build static directory if present
if getattr(sys, 'frozen', False):
    frontend_dist = Path(sys._MEIPASS) / "frontend" / "dist"
else:
    frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

