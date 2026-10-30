# 🎬 MK Subtitle & Dubbing Studio

An all-in-one desktop and web AI subtitle workflow suite designed for Windows. It provides end-to-end video subtitling, precision speech-to-text alignment, voice gender recognition, neural voiceover dubbing, and hardware-accelerated video rendering.

Built specifically for high performance on Windows with support from short clips (TikTok / Reels 9:16 vertical videos) up to full-length movies (1 hour+).

---

## ✨ Key Features

* **🎙️ Whisper AI Speech-to-Text with Word-Level Sync**:
  * Utilizes OpenAI Whisper (`tiny`, `base`, `small`, `medium`) with cross-attention Dynamic Time Warping (DTW) word timestamps.
  * Subtitle start and end times snap with sub-second accuracy to when speech begins and ends, eliminating trailing silence gaps.

* **🚻 Automatic Voice Gender Detection**:
  * Acoustic fundamental frequency ($F_0$) pitch analysis directly classifies whether each spoken line is **Male** (~85–165 Hz) or **Female** (~165–280 Hz).
  * Automatically color-codes dialogue on the timeline with **`[M]`** (Blue) and **`[F]`** (Emerald) badges.

* **🌐 1-Click Khmer Translation**:
  * **Google Free Translation**: Instant 1-click translation from Chinese, English, Vietnamese, Thai, etc. directly into natural Khmer without requiring any API keys.
  * **Google Gemini AI**: Optional deep contextual translation with API key for cinematic nuance and idioms.
  * Translate all lines or only selected rows with a single click.

* **🗣️ Neural Voice Dubbing (Edge-TTS)**:
  * Automatically assigns high-quality neural voices based on detected speaker gender:
    * **Male** $\rightarrow$ `km-KH-PisethNeural`
    * **Female** $\rightarrow$ `km-KH-SreymomNeural`
  * **Auto-Fit Duration Engine**: Dynamically calculates and stretches/accelerates audio via FFmpeg `atempo` to ensure spoken voice lines fit within their subtitle windows without collision.

* **⏱️ Dual-Track Visual Timeline**:
  * **Track T1 (Subtitles)**: Interactive blocks with drag-to-resize duration, click-to-seek, and voice gender badges.
  * **Track A1 (Audio)**: Visualizes generated voiceover audio segments with instant preview and speed indicators.
  * Adaptive time ruler supports both short clips and 1h+ videos.

* **🚀 Hardware-Accelerated Video Rendering**:
  * Burns styled subtitles directly into MP4 using `libass` with native Khmer typography (`Kantumruy Pro`, `Khmer OS Siemreap`).
  * Supports AMD AMF GPU hardware encoding (`h264_amf`) with automatic CPU fallback (`libx264 veryfast`).
  * Proportional layout for both **16:9 widescreen** and **9:16 vertical drama / reels** formats.

* **🔇 100% Background Execution**:
  * Zero flashing black command-prompt windows on Windows (`CREATE_NO_WINDOW` enabled across all sub-processes).

---

## 📋 System Requirements

* **Operating System**: Windows 10 or Windows 11 (64-bit)
* **Python**: 3.10, 3.11, 3.12, or 3.13 (64-bit)
* **Node.js**: v18.0+ (only required if building frontend from source)
* **FFmpeg**: Version 5.0+ with `libass` and `h264_amf` (recommended)
* **Hardware**:
  * Minimum 4 GB RAM (8 GB+ recommended)
  * Dedicated GPU (AMD Radeon / NVIDIA / Intel) recommended for hardware rendering, but CPU fallback is fully supported.

---

## 🛠️ Installation Guide

### Step 1: Clone or Download the Repository

```bash
git clone https://github.com/your-username/mk_subtitle.git
cd mk_subtitle
```

### Step 2: Install FFmpeg

Ensure `ffmpeg` and `ffprobe` are installed and available in your system `PATH`:

```powershell
# Quick install via Windows Package Manager (PowerShell):
winget install Gyan.FFmpeg
```

*Alternatively, download FFmpeg from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) and place `ffmpeg.exe` and `ffprobe.exe` inside a `tools/` folder in the project root.*

To verify FFmpeg:
```powershell
ffmpeg -version
ffprobe -version
```

### Step 3: Set Up Python Environment & Install Dependencies

It is recommended to use a virtual environment:

```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install required Python packages
pip install --upgrade pip
pip install -r requirements.txt
```

*Key packages installed include `fastapi`, `uvicorn`, `edge-tts`, `openai-whisper`, `torch`, `soundfile`, `scipy`, `numpy`, and `pywebview`.*

### Step 4: Build the Frontend (Vite + React)

If `frontend/dist` is not already compiled:

```powershell
cd frontend
npm install
npm run build
cd ..
```

---

## 🚀 Running the Studio

### Option A: One-Click Native Desktop App (Recommended)
Double-click `run.bat` or run:

```powershell
run.bat
```

*This launches the application as a standalone native Windows desktop application (powered by Edge Chromium WebView2) with zero console popups.*

### Option B: Run via Python CLI
```powershell
python desktop_app.py
```

### Option C: Run Web Server Only (Browser Access)
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8800
```
Open your browser and navigate to: **`http://127.0.0.1:8800`**

---

## 📦 Building Standalone `.exe` Windows Executable

To bundle the entire studio into a portable Windows executable:

```powershell
build_desktop_exe.bat
```

The compiled standalone executable will be located at:
```
dist\MK-Subtitle-Studio\MK-Subtitle-Studio.exe
```

---

## 📖 Step-by-Step Workflow

1. **Load Video**:
   * Click **Load Video** on the left sidebar to select your media file (supports `.mp4`, `.mov`, `.mkv`, etc.).
2. **Auto-Transcribe with Whisper**:
   * Click the green **Transcribe** button above the timeline.
   * Choose your Whisper model size (`tiny` for speed, `base` for balanced accuracy).
   * Whisper transcribes dialogues and automatically classifies each speaker as **Male** or **Female**.
3. **Inspect Subtitles & Timeline**:
   * Dialogue lines populate the table with **`[M]`** / **`[F]`** badges.
   * On the timeline, click any block to seek the video player to that exact line.
4. **1-Click Translation to Khmer**:
   * Click **Google Translate to Khmer** on the top bar to translate dialogue lines to natural Khmer.
   * To translate only specific lines, check their boxes and click `Translate Selected`.
5. **Generate Voiceover Dubbing**:
   * Click **Generate Selected Audio** above the timeline.
   * The studio uses Edge-TTS to dub male lines with `km-KH-PisethNeural` and female lines with `km-KH-SreymomNeural`.
   * Audios appear on Track A1 with custom playback preview.
6. **Render & Burn Video**:
   * Click **Burn Video** on the left workspace sidebar.
   * Choose subtitle style (Modern Yellow, Classic White, Box Dark), adjust font size, and toggle GPU acceleration.
   * Click **Start Render & Burn** to export your dubbed, hard-subbed video.

---

## 📁 Project Structure

```
mk_subtitle/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI REST endpoints & static server
│   │   ├── config.py                # System paths, subprocess flags & FFmpeg locator
│   │   ├── models/
│   │   │   └── subtitle.py          # Pydantic data schemas
│   │   └── services/
│   │       ├── whisper_stt.py       # Whisper STT & F0 vocal pitch gender detection
│   │       ├── translator.py        # Google Free & Gemini AI translation
│   │       ├── tts_engine.py        # Edge-TTS neural speech & duration auto-fit
│   │       ├── audio_mixer.py       # High-speed in-memory audio timeline mixer
│   │       ├── subtitle_parser.py   # SRT, VTT, ASS parser & ASS resolution scaler
│   │       └── ffmpeg_runner.py     # AMD AMF GPU & CPU hard-sub video burning
│   └── requirements.txt             # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SubtitleDataTable.jsx # Table editor with Google Translate & voice filters
│   │   │   ├── TimelineEditor.jsx    # Dual-track visual timeline (T1 subtitles, A1 audio)
│   │   │   ├── AIModal.jsx           # Whisper STT & AI translation dialog
│   │   │   └── ExportModal.jsx       # Video rendering and hard-sub options
│   │   ├── App.jsx                   # Main studio application state
│   │   └── main.jsx                  # React DOM entry
│   └── dist/                        # Production compiled frontend bundle
├── storage/
│   ├── uploads/                     # User uploaded video files
│   ├── audio_cache/                 # Generated TTS voice clips and temp tracks
│   └── exports/                     # Rendered MP4 video outputs
├── desktop_app.py                   # PyWebView native Windows desktop wrapper
├── run.bat                          # Silent desktop app launcher (CREATE_NO_WINDOW)
├── build_desktop_exe.bat            # PyInstaller build automation script
├── requirements.txt                 # Root Python requirements
└── test_suite.py                    # Automated end-to-end integration test suite
```

---

## 🧪 Testing

Run the automated test suite to verify all studio subsystems:

```powershell
python test_suite.py
```

Tests verify:
1. Subtitle parsing (SRT, VTT, ASS).
2. Subtitle overlap fixer.
3. Export formats.
4. Google Free Khmer translation.
5. Edge-TTS neural speech generation & tempo auto-fit.
6. Video rendering and hard-sub burning with AMF GPU / CPU.

---

## 📄 License

Proprietary / Internal Studio Tool. All rights reserved.
