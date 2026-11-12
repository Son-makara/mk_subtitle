# MK Movie - Subtitle & Dubbing Studio

> **Khmer AI Subtitle, Dubbing & Video Hard-Sub Studio**  
> An all-in-one desktop and web application for automated video transcription (OpenAI Whisper), AI translation to Khmer, pitch-matched Edge-TTS voice dubbing, vocal separation (UVR AI), custom watermark branding, and hardware-accelerated (AMD AMF / NVIDIA NVENC / CPU) multi-episode batch video rendering.

---

## 🌟 Key Features

- **OpenAI Whisper AI Transcription**: Automatic multi-language speech-to-text (Chinese, English, etc.) with timestamp alignment.
- **Smart Khmer Translation**: Instant high-accuracy translation into Khmer (`km`) via Google Translate or Google Gemini AI.
- **Natural Voice Dubbing (Edge-TTS)**: Pitch-matched natural Khmer voices (`km-KH-PisethNeural`, `km-KH-SreymomNeural`) with automatic audio time-stretching to match original video lip sync.
- **UVR AI Vocal Separation**: Erase original speech while preserving background music & sound effects.
- **Custom Watermark & Brand Logo**: Upload and place custom logos (PNG/JPG/WEBP) at Top-Left, Top-Right, Bottom-Left, or Bottom-Right with live preview scaling.
- **Hardware-Accelerated Video Rendering**: Ultra-fast hard-sub burning with AMD AMF (`h264_amf`), NVIDIA NVENC (`h264_nvenc`), or CPU (`libx264`).
- **Batch Processing & Concat Demuxer**: Process multi-episode drama series simultaneously or combine multiple episodes into a single continuous movie with stream copy in seconds.
- **Native Desktop & Web Modes**: Launch as a lightweight native Windows desktop application (via PyWebView) or run as a local web server in your browser.

---

## 💻 System Requirements

- **Operating System**: Windows 10 / 11 (64-bit)
- **Python**: Python 3.10 – 3.13 (64-bit)
- **Node.js**: v18.0+ or v20.0+ with npm (for frontend building/development)
- **FFmpeg & FFprobe**: Installed and added to system `PATH` (or placed in `tools/` folder)
- **Hardware**:
  - *CPU*: Dual-core 2.0 GHz+ (Intel/AMD)
  - *RAM*: 8 GB minimum (16 GB recommended for Whisper & batch rendering)
  - *GPU* (Optional): AMD Radeon (supports AMF) or NVIDIA GeForce (supports NVENC / CUDA) for hardware-accelerated video burning and Whisper STT.

---

## 🚀 Installation Guide

### Step 1: Clone or Open the Repository

```bash
git clone https://github.com/your-username/mk_subtitle.git
cd mk_subtitle
```

### Step 2: Set Up Python Environment

Create a virtual environment (recommended) or use your system Python:

```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Windows Command Prompt:
.\venv\Scripts\activate.bat
```

Install backend dependencies:

```powershell
pip install -r requirements.txt
```

> **Note on PyTorch (GPU Support)**:  
> If you have an NVIDIA GPU and want CUDA acceleration for Whisper:  
> `pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124`  
> AMD or CPU users can use the standard PyTorch installed by `requirements.txt`.

### Step 3: Install FFmpeg

FFmpeg and FFprobe are required for audio extraction, vocal separation, and video rendering.

1. Download FFmpeg from [https://www.gyan.dev/ffmpeg/builds/](https://www.gyan.dev/ffmpeg/builds/) (Release Essentials or Full build).
2. Extract the archive and copy `ffmpeg.exe` and `ffprobe.exe` into:
   - Either your system `PATH`, OR
   - The project's `tools/` directory (`d:\Coding\mk_subtitle\tools\`).

To verify installation, open terminal and type:
```bash
ffmpeg -version
ffprobe -version
```

### Step 4: Install Frontend Dependencies & Build

Navigate to the `frontend` directory and install npm packages:

```powershell
cd frontend
npm install
npm run build
cd ..
```

---

## 🎬 How to Run the App

### Option A: One-Click Desktop Launch (Recommended)

Simply double-click:
```text
run.bat
```
This script automatically detects your environment, starts the background FastAPI backend engine, and launches the native desktop window.

### Option B: Run via Python Terminal

```powershell
python desktop_app.py
```

### Option C: Run in Web Browser / Development Mode

If you prefer developing or using your default web browser (Chrome, Edge):

1. **Start the Backend API Server**:
   ```powershell
   uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
2. **Start the Frontend Dev Server**:
   ```powershell
   cd frontend
   npm run dev
   ```
3. Open your browser at [http://localhost:5173](http://localhost:5173).

---

## 📦 Building Standalone Executable (.exe)

You can package the entire application into a standalone Windows `.exe` that does not require Python or Node.js on the target machine:

```powershell
# Run the build batch script
build_desktop_exe.bat

# OR run via python
python desktop_app.py --build
```

The resulting standalone application will be generated in:
```text
dist\MK-Subtitle-Studio\MK-Subtitle-Studio.exe
```

---

## 📁 Project Directory Structure

```text
mk_subtitle/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI application & REST endpoints
│   │   ├── config.py             # System paths, storage & FFmpeg config
│   │   ├── models/               # Pydantic schemas (subtitles, requests)
│   │   └── services/
│   │       ├── whisper_stt.py    # OpenAI Whisper speech-to-text
│   │       ├── translator.py     # Gemini & Google Translate services
│   │       ├── tts_engine.py     # Microsoft Edge-TTS Khmer synthesis
│   │       ├── vocal_separator.py# UVR vocal & BGM isolation
│   │       └── ffmpeg_runner.py  # Hard-sub burning, AMF encoder & concat
├── frontend/
│   ├── src/
│   │   ├── components/           # UI components (Timeline, Queue, ExportModal)
│   │   ├── utils/                # Time formatting & helpers
│   │   ├── App.jsx               # Main React Studio layout & state
│   │   └── main.jsx              # React DOM entry
│   └── package.json              # Vite & React dependencies
├── storage/                      # Audio cache, uploads & rendered exports
├── assets/                       # Branding logos & app icons
├── desktop_app.py                # Native PyWebView launcher & build script
├── run.bat                       # Quick desktop launcher
├── build_desktop_exe.bat         # PyInstaller one-click builder
├── requirements.txt              # Python dependencies
└── README.md                     # Documentation
```

---

## 🛠️ Troubleshooting

- **Audio/Video Not Found on Transcribe**:
  - Make sure the video path or filename is valid. The app automatically searches your local video folders and uploaded files.
- **FFmpeg Not Found**:
  - Ensure `ffmpeg.exe` and `ffprobe.exe` are in your Windows `PATH` environment variable or placed in the `tools/` folder.
- **Port Conflict (Port 8000 / 8800 in use)**:
  - `desktop_app.py` automatically detects occupied ports and binds to the next available port.

---

## 📄 License

This project is for personal, educational, and creative content creation. All third-party libraries (OpenAI Whisper, Microsoft Edge-TTS, FFmpeg) belong to their respective copyright holders.

