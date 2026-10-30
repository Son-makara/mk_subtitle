@echo off
title MK Subtitle & Dubbing Studio
cd /d "%~dp0"

:: 1. If compiled executable exists, launch it directly in background
if exist "dist\MK-Subtitle-Studio\MK-Subtitle-Studio.exe" (
    start "" "dist\MK-Subtitle-Studio\MK-Subtitle-Studio.exe"
    exit /b 0
)

:: 2. If pythonw is available, launch silently in background with zero console window
where pythonw >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start "" pythonw desktop_app.py
    exit /b 0
)

:: 3. Fallback: launch in background and close command prompt
start "" python desktop_app.py
exit /b 0
