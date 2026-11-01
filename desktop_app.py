import os
import sys
import time
import socket
import threading
import uvicorn
import webview

# Configure UTF-8 on Windows to safely handle non-ASCII video titles (Chinese, Khmer)
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Handle base path in both script and frozen (PyInstaller) mode
if getattr(sys, "frozen", False):
    BASE_PATH = getattr(sys, "_MEIPASS", os.path.dirname(sys.executable))
else:
    BASE_PATH = os.path.dirname(os.path.abspath(__file__))

if BASE_PATH not in sys.path:
    sys.path.insert(0, BASE_PATH)

def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def find_available_port(start_port: int = 8800) -> int:
    port = start_port
    while is_port_in_use(port):
        port += 1
    return port

def run_uvicorn_server(host: str, port: int):
    """Runs FastAPI in background daemon thread"""
    from backend.app.main import app

    config = uvicorn.Config(
        app=app,
        host=host,
        port=port,
        log_level="warning",
        access_log=False
    )
    server = uvicorn.Server(config)
    server.run()

def build_standalone_exe():
    """Builds frontend and compiles standalone Windows executable using PyInstaller"""
    import subprocess
    import shutil

    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")

    print("=" * 60)
    print(" Building MK Subtitle Studio Standalone Executable")
    print("=" * 60)

    # Terminate any running instances of the app to prevent Windows file locking
    if sys.platform == "win32":
        subprocess.run(["taskkill", "/f", "/im", "MK-Subtitle-Studio.exe"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(1.0)

    # 1. Build frontend Vite assets
    print("\n[1/3] Building frontend assets (npm run build)...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    res = subprocess.run([npm_cmd, "run", "build"], cwd=frontend_dir)
    if res.returncode != 0:
        print("[ERROR] Frontend build failed.")
        sys.exit(1)

    # 2. PyInstaller freeze
    print("\n[2/3] Freezing standalone desktop executable with PyInstaller...")
    dist_dir = os.path.join(root_dir, "dist", "MK-Subtitle-Studio")
    dist_storage = os.path.join(dist_dir, "storage")
    temp_storage = os.path.join(root_dir, ".temp_build_storage")
    has_temp_storage = False

    if os.path.exists(dist_storage):
        try:
            if os.path.exists(temp_storage):
                shutil.rmtree(temp_storage, ignore_errors=True)
            shutil.move(dist_storage, temp_storage)
            has_temp_storage = True
        except Exception:
            pass

    # Ensure build directories exist to avoid Windows PyInstaller race conditions
    os.makedirs(os.path.join(root_dir, "build", "MK-Subtitle-Studio"), exist_ok=True)
    spec_path = os.path.join(root_dir, "MK-Subtitle-Studio.spec")

    if os.path.exists(spec_path):
        pyinstaller_cmd = [
            sys.executable, "-m", "PyInstaller",
            "--noconfirm",
            spec_path
        ]
    else:
        pyinstaller_cmd = [
            sys.executable, "-m", "PyInstaller",
            "--noconfirm",
            "--onedir",
            "--windowed",
            "--name", "MK-Subtitle-Studio",
            "--icon", os.path.join("assets", "logo.ico"),
            "--add-data", f"frontend/dist{os.pathsep}frontend/dist",
            "--add-data", f"assets{os.pathsep}assets",
            "--add-data", f"models{os.pathsep}models",
            "--collect-all", "ai_edge_litert",
            "--copy-metadata", "ai-edge-litert",
            "--collect-data", "whisper",
            "--copy-metadata", "openai-whisper",
            "--copy-metadata", "tqdm",
            "--copy-metadata", "regex",
            "--copy-metadata", "requests",
            "--copy-metadata", "packaging",
            "--copy-metadata", "filelock",
            "--copy-metadata", "numpy",
            "--copy-metadata", "torch",
            "--exclude-module", "cv2",
            "--exclude-module", "imageio",
            "--exclude-module", "imageio_ffmpeg",
            "--exclude-module", "sklearn",
            "--exclude-module", "transformers",
        ]

        try:
            import whisper
            whisper_src = os.path.dirname(whisper.__file__)
            whisper_assets = os.path.join(whisper_src, "assets")
            whisper_normalizers = os.path.join(whisper_src, "normalizers")
            if os.path.exists(whisper_assets):
                pyinstaller_cmd.extend(["--add-data", f"{whisper_assets}{os.pathsep}whisper/assets"])
            if os.path.exists(whisper_normalizers):
                pyinstaller_cmd.extend(["--add-data", f"{whisper_normalizers}{os.pathsep}whisper/normalizers"])
        except Exception:
            pass

        pyinstaller_cmd.append("desktop_app.py")

    res = subprocess.run(pyinstaller_cmd, cwd=root_dir)

    # Restore user storage if it was preserved
    if has_temp_storage and os.path.exists(temp_storage):
        try:
            target_storage = os.path.join(dist_dir, "storage")
            if os.path.exists(target_storage):
                shutil.rmtree(target_storage, ignore_errors=True)
            shutil.move(temp_storage, target_storage)
        except Exception:
            pass

    if res.returncode != 0:
        print("[ERROR] PyInstaller freeze failed.")
        sys.exit(1)

    # 3. Setup runtime tools (FFmpeg & Whisper assets)
    print("\n[3/3] Setting up runtime tools & AI assets...")
    dist_internal = os.path.join(root_dir, "dist", "MK-Subtitle-Studio", "_internal")
    
    # Ensure Whisper assets (mel_filters.npz, multilingual.tiktoken) are in _internal/whisper
    try:
        import whisper
        whisper_src = os.path.dirname(whisper.__file__)
        whisper_dst = os.path.join(dist_internal, "whisper")
        for folder_name in ["assets", "normalizers"]:
            src_folder = os.path.join(whisper_src, folder_name)
            dst_folder = os.path.join(whisper_dst, folder_name)
            if os.path.exists(src_folder):
                shutil.copytree(src_folder, dst_folder, dirs_exist_ok=True)
        print("Whisper model assets (mel_filters.npz, tokens) bundled successfully.")
    except Exception as e:
        print(f"Notice: could not copy whisper assets: {e}")

    # Copy FFmpeg and FFprobe binaries
    dest_tools = os.path.join(root_dir, "dist", "MK-Subtitle-Studio", "tools")
    os.makedirs(dest_tools, exist_ok=True)
    
    ffmpeg_found = shutil.which("ffmpeg")
    ffprobe_found = shutil.which("ffprobe")
    fallback_tools = r"D:\Coding\DAI-Dubber FREE_FULL_Windows_v3\release\tools"

    if ffmpeg_found and os.path.exists(ffmpeg_found):
        shutil.copy2(ffmpeg_found, os.path.join(dest_tools, "ffmpeg.exe"))
    elif os.path.exists(os.path.join(fallback_tools, "ffmpeg.exe")):
        shutil.copy2(os.path.join(fallback_tools, "ffmpeg.exe"), os.path.join(dest_tools, "ffmpeg.exe"))

    if ffprobe_found and os.path.exists(ffprobe_found):
        shutil.copy2(ffprobe_found, os.path.join(dest_tools, "ffprobe.exe"))
    elif os.path.exists(os.path.join(fallback_tools, "ffprobe.exe")):
        shutil.copy2(os.path.join(fallback_tools, "ffprobe.exe"), os.path.join(dest_tools, "ffprobe.exe"))

    if os.path.exists(os.path.join(dest_tools, "ffmpeg.exe")):
        print("Runtime FFmpeg tools bundled successfully.")

    # Copy UVR AI Models
    dest_models = os.path.join(root_dir, "dist", "MK-Subtitle-Studio", "models")
    os.makedirs(dest_models, exist_ok=True)
    src_models = os.path.join(root_dir, "models")
    if os.path.exists(src_models):
        for f in os.listdir(src_models):
            shutil.copy2(os.path.join(src_models, f), os.path.join(dest_models, f))
        print("UVR vocal separation models bundled successfully.")

    # Sync single root launcher executable
    built_exe = os.path.join(root_dir, "dist", "MK-Subtitle-Studio", "MK-Subtitle-Studio.exe")

    print("\n" + "=" * 60)
    print(" BUILD SUCCESSFUL!")
    print(" Standalone Executable created at:")
    print(f"   {os.path.join(root_dir, 'dist', 'MK-Subtitle-Studio', 'MK-Subtitle-Studio.exe')}")
    print("=" * 60)

def main():
    if "--build" in sys.argv or "-b" in sys.argv:
        build_standalone_exe()
        sys.exit(0)

    host = "127.0.0.1"
    port = find_available_port(8800)

    # 1. Start background server thread
    server_thread = threading.Thread(
        target=run_uvicorn_server,
        args=(host, port),
        daemon=True
    )
    server_thread.start()

    # 2. Wait for server socket readiness
    max_wait = 10.0
    start_time = time.time()
    while time.time() - start_time < max_wait:
        if is_port_in_use(port, host):
            break
        time.sleep(0.1)

    url = f"http://{host}:{port}"
    print(f"[MK Movie Studio] Running native desktop on {url}")

    icon_path = os.path.join(BASE_PATH, "assets", "logo.ico")
    if not os.path.exists(icon_path):
        icon_path = None

    # 3. Create native Windows WebView2 window
    window = webview.create_window(
        title="MK Movie - Subtitle & Dubbing Studio",
        url=url,
        width=1320,
        height=850,
        min_size=(1024, 680),
        background_color="#0b0f19",
        text_select=True,
        zoomable=True
    )

    # 4. Start GUI event loop
    webview.start(icon=icon_path, debug=False)
    sys.exit(0)

if __name__ == "__main__":
    main()
