@echo off
setlocal
title MK Subtitle & Dubbing Studio - Automated Setup
cd /d "%~dp0"

echo ============================================================
echo   MK Subtitle & Dubbing Studio - 1-Click All-in-One Setup
echo ============================================================
echo.
echo Launching automated setup assistant...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
set SETUP_EXIT=%ERRORLEVEL%

if %SETUP_EXIT% neq 0 (
    echo.
    echo ============================================================
    echo [ERROR] Setup encountered an issue (Code: %SETUP_EXIT%).
    echo If needed, right-click and "Run as administrator".
    echo ============================================================
    echo.
    pause
    exit /b %SETUP_EXIT%
)

exit /b 0
