@echo off
title MK Subtitle & Dubbing Studio
cd /d "%~dp0"

:: 1. If user passed 'build' argument (or -b), compile standalone .exe
if /i "%~1"=="build" goto do_build
if /i "%~1"=="-b" goto do_build

:: 2. If compiled executable exists, launch it directly in background
if exist "dist\MK-Subtitle-Studio\MK-Subtitle-Studio.exe" (
    start "" "dist\MK-Subtitle-Studio\MK-Subtitle-Studio.exe"
    exit /b 0
)
if exist "MK-Subtitle-Studio.exe" (
    start "" "MK-Subtitle-Studio.exe"
    exit /b 0
)

:: 3. Prefer virtual environment Python if present
if exist "venv\Scripts\pythonw.exe" (
    start "" "venv\Scripts\pythonw.exe" desktop_app.py
    exit /b 0
)
if exist "venv\Scripts\python.exe" (
    start "" "venv\Scripts\python.exe" desktop_app.py
    exit /b 0
)

:: 4. If pythonw is available in PATH, launch silently in background with zero console window
where pythonw >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start "" pythonw desktop_app.py
    exit /b 0
)

:: 5. Fallback: launch via standard python in background
start "" python desktop_app.py
exit /b 0

:do_build
if exist "venv\Scripts\python.exe" (
    "venv\Scripts\python.exe" desktop_app.py --build
) else (
    python desktop_app.py --build
)
if "%~2"=="" pause
exit /b %ERRORLEVEL%
