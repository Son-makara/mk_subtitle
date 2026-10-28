@echo off
title Build MK Subtitle Desktop Executable
cd /d "%~dp0"

echo [1/3] Building frontend assets...
cd frontend
call npm.cmd run build
cd ..

echo.
echo [2/3] Compiling standalone desktop executable with PyInstaller...
python -m PyInstaller ^
    --noconfirm ^
    --onedir ^
    --windowed ^
    --name "MK-Subtitle-Studio" ^
    --icon "assets/logo.ico" ^
    --add-data "frontend/dist;frontend/dist" ^
    --add-data "assets;assets" ^
    desktop_app.py

echo.
echo [3/3] Setting up runtime tools (FFmpeg)...
if exist "D:\Coding\DAI-Dubber FREE_FULL_Windows_v3\release\tools" (
    xcopy /E /I /Y "D:\Coding\DAI-Dubber FREE_FULL_Windows_v3\release\tools" "dist\MK-Subtitle-Studio\_internal\tools\"
    xcopy /E /I /Y "D:\Coding\DAI-Dubber FREE_FULL_Windows_v3\release\tools" "dist\MK-Subtitle-Studio\tools\"
)

echo.
echo ========================================================
echo Build complete! Executable located in:
echo   dist\MK-Subtitle-Studio\MK-Subtitle-Studio.exe
echo ========================================================
pause

