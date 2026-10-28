import os
import sys
import time
import socket
import threading
import uvicorn
import webview

# Ensure project root is in sys.path
BASE_PATH = os.path.dirname(os.path.abspath(__file__))
if BASE_PATH not in sys.path:
    sys.path.insert(0, BASE_PATH)

from backend.app.main import app

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
    config = uvicorn.Config(
        app=app,
        host=host,
        port=port,
        log_level="warning",
        access_log=False
    )
    server = uvicorn.Server(config)
    server.run()

def main():
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

    # 3. Create native Windows WebView2 window (Dark theme matching studio)
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

    # 4. Start GUI event loop with MK Movie logo icon
    webview.start(icon=icon_path, debug=False)
    sys.exit(0)

if __name__ == "__main__":
    main()

