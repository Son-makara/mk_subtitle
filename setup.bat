@echo off
setlocal enabledelayedexpansion
title MK Subtitle Studio - New PC Automatic Setup
cd /d "%~dp0"

echo ============================================================
echo   MK Subtitle & Dubbing Studio - Fresh PC Setup Assistant
echo ============================================================
echo.

:: 1. Check Python
echo [1/6] Checking Python installation...
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not added to your system PATH!
    echo.
    echo Please install Python 3.10, 3.11, or 3.12:
    echo   - Download from: https://www.python.org/downloads/
    echo   - CRITICAL: Make sure to check "[X] Add python.exe to PATH" during installation!
    echo   - OR run via PowerShell: winget install -e --id Python.Python.3.11
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do echo [OK] Found: %%i

:: 2. Check Node.js and npm
echo.
echo [2/6] Checking Node.js & npm...
npm --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js / npm is not installed or not in PATH!
    echo.
    echo Please install Node.js LTS:
    echo   - Download from: https://nodejs.org/ (LTS version)
    echo   - OR run via PowerShell: winget install -e --id OpenJS.NodeJS.LTS
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
echo [OK] Node.js %NODE_VER% and npm %NPM_VER% detected.

:: 3. Check FFmpeg
echo.
echo [3/6] Checking FFmpeg multimedia engine...
set FFMPEG_FOUND=0
if exist "tools\ffmpeg.exe" (
    echo [OK] Found bundled FFmpeg in tools\ffmpeg.exe
    set FFMPEG_FOUND=1
) else (
    ffmpeg -version >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [OK] Found FFmpeg in system PATH
        set FFMPEG_FOUND=1
    )
)

if !FFMPEG_FOUND! equ 0 (
    echo [WARNING] FFmpeg was not found in 'tools\' folder or system PATH!
    echo Subtitle burning, audio extraction, and vocal separation require FFmpeg.
    echo.
    echo Recommended quick fix:
    echo   Option A: Run in PowerShell: winget install Gyan.FFmpeg
    echo   Option B: Download from https://www.gyan.dev/ffmpeg/builds/
    echo             Extract ffmpeg.exe and ffprobe.exe into the 'tools\' folder.
    echo.
    echo You can continue setup now, but make sure to add FFmpeg before rendering.
    echo.
)

:: 4. Set up Python Virtual Environment
echo.
echo [4/6] Setting up Python virtual environment (venv)...
if not exist "venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv venv
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)
echo [OK] Virtual environment ready.

:: 5. Install Python dependencies
echo.
echo [5/6] Installing backend dependencies...
call "venv\Scripts\activate.bat"
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt
if !ERRORLEVEL! neq 0 (
    echo [ERROR] Failed to install requirements.txt. Please check error messages above.
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed successfully.

:: Optional NVIDIA PyTorch prompt
echo.
echo Do you have an NVIDIA GPU and want CUDA acceleration for faster Whisper STT? (Y/N)
set /p HAS_NVIDIA="[Default is N]: "
if /i "!HAS_NVIDIA!"=="Y" (
    echo Installing PyTorch with CUDA 12.4 support...
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
)

:: 6. Build frontend
echo.
echo [6/6] Installing frontend packages and compiling UI bundle...
cd frontend
call npm install
if !ERRORLEVEL! neq 0 (
    echo [ERROR] npm install failed.
    cd ..
    pause
    exit /b 1
)
call npm run build
if !ERRORLEVEL! neq 0 (
    echo [ERROR] npm run build failed.
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Frontend built successfully.

:: Ensure storage folders exist
if not exist "storage\uploads" mkdir "storage\uploads"
if not exist "storage\audio_cache" mkdir "storage\audio_cache"
if not exist "storage\exports" mkdir "storage\exports"

echo.
echo ============================================================
echo   SETUP COMPLETED SUCCESSFULLY!
echo ============================================================
echo.
echo You can now launch the studio by running:
echo   .\run.bat
echo.
pause
