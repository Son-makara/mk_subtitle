# MK Subtitle & Dubbing Studio

An all-in-one desktop & web subtitle workflow suite designed for Windows. It combines subtitle editing, speech-to-text (Whisper AI), context-aware AI translation, neural voiceover dubbing (Edge-TTS), and hardware-accelerated video rendering (FFmpeg with AMD AMF GPU encoding).

---

## 🌟 Key Features

1. **Dual-Pane Timeline Studio**:
   - Synchronized HTML5 video player with real-time subtitle preview overlay.
   - Interactive subtitle table with millisecond-precision seeking, line splitting, merging, and high-CPS (reading speed) warnings.
   - Search and filter across original and translated text.

2. **AI Speech-to-Text (STT)**:
   - Built-in Whisper integration (`tiny`, `base`, `small`, `medium`).
   - Automatically extracts speech from video files into timestamped subtitle blocks.

3. **Multilingual AI Translation**:
   - **Google Gemini API**: Contextual, idiom-aware dialogue translation (Khmer, English, Chinese, Vietnamese, Thai, etc.).
   - **Free Google Translate**: Instant translation without requiring any API keys.
   - Dual-track display: view original text and translated text simultaneously.

4. **Neural Voice Dubbing (Edge-TTS)**:
   - Instant high-quality neural voices across 40+ languages (e.g., Khmer Piseth/Sreymom, English Guy/Jenny, Chinese Xiaoxiao/Yunxi).
   - **Auto-Fit Duration Engine**: Dynamically calculates speech tempo and stretches/accelerates audio via FFmpeg `atempo` to ensure spoken voice lines fit within their subtitle windows without collision.
   - Background audio ducking: Automatically lowers original video sound when voiceover plays.

5. **Hardware-Accelerated Video Rendering**:
   - Burns styled subtitles (Cinematic Yellow, Classic White, Dark Boxed) directly into MP4 video using `libass`.
   - Utilizes AMD AMF GPU encoding (`h264_amf`) with seamless CPU fallback (`libx264`).

---

## 🚀 Quick Start

### 1. Launch Native Desktop App
Double-click `run.bat` in the root folder, or run:
```bash
run.bat
```
This opens the studio as a standalone native Windows desktop application (powered by Edge Chromium WebView2, matching DAI-Dubber). No browser tabs or navigation chrome.

### 2. Build Standalone `.exe` Windows Executable
Double-click `build_desktop_exe.bat` to bundle the application using PyInstaller into:
`dist\MK-Subtitle-Studio\MK-Subtitle-Studio.exe`

---

## 📂 Project Structure

```
mk_subtitle/
├── backend/
│   └── app/
│       ├── main.py                  # FastAPI REST endpoints
│       ├── config.py                # System paths & FFmpeg locator
│       ├── models/
│       │   └── subtitle.py          # Data models & schemas
│       └── services/
│           ├── subtitle_parser.py   # SRT, VTT, ASS parser & fixer
│           ├── tts_engine.py        # Edge-TTS & time-stretch engine
│           ├── audio_mixer.py       # Audio timeline & ducking mixer
│           ├── translator.py        # Gemini & Google Translate
│           ├── whisper_stt.py       # Whisper speech-to-text
│           └── ffmpeg_runner.py     # AMD AMF video burn & export
├── frontend/
│   ├── src/                         # React 19 + Vite studio UI
│   └── dist/                        # Production compiled web assets
├── storage/                         # Uploads, audio cache, and rendered exports
├── desktop_app.py                   # Desktop application entry point
├── run.bat                          # One-click native desktop launcher
└── build_desktop_exe.bat            # Freezes application to standalone .exe
```

