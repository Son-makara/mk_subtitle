import os
import sys
import shutil
import subprocess
from pathlib import Path

# Subprocess creation flags (CREATE_NO_WINDOW on Windows to prevent flashing console popups)
SUBPROCESS_FLAGS = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000) if sys.platform == "win32" else 0

# Base Paths (supports development and frozen PyInstaller .exe mode)
if getattr(sys, 'frozen', False):
    EXE_DIR = Path(sys.executable).parent
    BUNDLE_DIR = Path(sys._MEIPASS)
    BASE_DIR = EXE_DIR
else:
    EXE_DIR = Path(__file__).resolve().parent.parent.parent
    BUNDLE_DIR = EXE_DIR
    BASE_DIR = EXE_DIR

STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
AUDIO_CACHE_DIR = STORAGE_DIR / "audio_cache"
EXPORTS_DIR = STORAGE_DIR / "exports"

for d in [STORAGE_DIR, UPLOADS_DIR, AUDIO_CACHE_DIR, EXPORTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Locate FFmpeg
def find_ffmpeg() -> str:
    # 1. Local tools folder next to exe or in base dir
    local_tool = BASE_DIR / "tools" / "ffmpeg.exe"
    if local_tool.exists():
        return str(local_tool)
    # 2. PATH
    path = shutil.which("ffmpeg")
    if path:
        return path
    # 3. Fallback to command name
    return "ffmpeg"

def find_ffprobe() -> str:
    # 1. Local tools folder
    local_tool = BASE_DIR / "tools" / "ffprobe.exe"
    if local_tool.exists():
        return str(local_tool)
    # 2. PATH
    path = shutil.which("ffprobe")
    if path:
        return path
    # 3. Fallback to command name
    return "ffprobe"

FFMPEG_PATH = find_ffmpeg()
FFPROBE_PATH = find_ffprobe()

# Server Settings
HOST = os.getenv("MK_HOST", "127.0.0.1")
PORT = int(os.getenv("MK_PORT", "8800"))
DEBUG = os.getenv("MK_DEBUG", "True").lower() in ("true", "1")

