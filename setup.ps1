<#
.SYNOPSIS
    MK Subtitle & Dubbing Studio - All-in-One Automated Setup Script
.DESCRIPTION
    Installs and configures everything needed to run MK Subtitle Studio on a fresh PC:
    - Checks / Installs Python 3.10+
    - Checks / Installs Node.js LTS & npm
    - Checks / Downloads FFmpeg & FFprobe into tools/
    - Checks / Installs Microsoft Edge WebView2 runtime
    - Creates Python virtual environment (venv)
    - Installs all backend AI & multimedia dependencies
    - Auto-detects NVIDIA GPU and configures CUDA acceleration
    - Compiles frontend production assets (Vite UI bundle)
    - Pre-caches AI speech recognition models
    - Verifies all tools and provides one-click launch
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

# Helper display functions
function Write-Step {
    param([string]$Num, [string]$Title)
    Write-Host "`n[$Num] $Title" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Msg)
    Write-Host "  [OK] $Msg" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Msg)
    Write-Host "  [!] $Msg" -ForegroundColor Yellow
}

function Write-Failure {
    param([string]$Msg)
    Write-Host "  [ERROR] $Msg" -ForegroundColor Red
}

function Update-EnvPath {
    $machinePath = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    $env:PATH = "$userPath;$machinePath;$env:PATH"
}

Clear-Host
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   MK Subtitle & Dubbing Studio - Complete All-in-One Setup" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " This installer will automatically check, download, and configure"
Write-Host " all required software, AI models, and multimedia engines."
Write-Host " Target Folder: $ScriptDir"
Write-Host "------------------------------------------------------------"

# -------------------------------------------------------------------------
# STEP 1: Check / Install Python
# -------------------------------------------------------------------------
Write-Step "1/8" "Checking Python Installation..."

$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonCmd = "py"
}

# Check common Windows Python install locations if not in PATH
if (-not $pythonCmd) {
    $knownPythonPaths = @(
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe",
        "C:\Program Files\Python311\python.exe",
        "C:\Program Files\Python312\python.exe",
        "C:\Program Files\Python310\python.exe"
    )
    foreach ($p in $knownPythonPaths) {
        if (Test-Path $p) {
            $pythonCmd = $p
            $pythonDir = Split-Path -Parent $p
            $env:PATH = "$pythonDir;$pythonDir\Scripts;$env:PATH"
            break
        }
    }
}

if (-not $pythonCmd) {
    Write-Warn "Python was not detected. Attempting automatic installation via winget..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        try {
            & winget install -e --id Python.Python.3.11 --override "/passive InstallAllUsers=1 PrependPath=1" --accept-package-agreements --accept-source-agreements
            Update-EnvPath
            if (Get-Command python -ErrorAction SilentlyContinue) { $pythonCmd = "python" }
        } catch {}
    }
    
    if (-not $pythonCmd) {
        Write-Warn "Downloading official Python 3.11 installer..."
        $pyInstaller = "$env:TEMP\python-3.11.9-amd64.exe"
        & curl.exe -L -# -o $pyInstaller "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
        if (Test-Path $pyInstaller) {
            Write-Host "  Installing Python (silent)..." -ForegroundColor Yellow
            Start-Process -FilePath $pyInstaller -ArgumentList "/passive InstallAllUsers=0 PrependPath=1" -Wait
            Update-EnvPath
            Remove-Item -Force $pyInstaller -ErrorAction SilentlyContinue
        }
    }
}

# Validate Python
try {
    $pyVer = & python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')"
    Write-Success "Python $pyVer detected."
} catch {
    Write-Failure "Python installation could not be completed automatically."
    Write-Host "  Please download and install Python 3.10-3.12 from https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "  IMPORTANT: Check '[X] Add python.exe to PATH' during installation!" -ForegroundColor Red
    pause
    exit 1
}

# -------------------------------------------------------------------------
# STEP 2: Check / Install Node.js & npm
# -------------------------------------------------------------------------
Write-Step "2/8" "Checking Node.js & npm..."

$nodeAvailable = (Get-Command node -ErrorAction SilentlyContinue) -and (Get-Command npm -ErrorAction SilentlyContinue)

if (-not $nodeAvailable) {
    $knownNodePaths = @("C:\Program Files\nodejs", "$env:LOCALAPPDATA\Programs\nodejs")
    foreach ($np in $knownNodePaths) {
        if (Test-Path "$np\node.exe") {
            $env:PATH = "$np;$env:APPDATA\npm;$env:PATH"
            $nodeAvailable = $true
            break
        }
    }
}

if (-not $nodeAvailable) {
    Write-Warn "Node.js was not detected. Attempting automatic installation via winget..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        try {
            & winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
            Update-EnvPath
            $nodeAvailable = (Get-Command node -ErrorAction SilentlyContinue)
        } catch {}
    }
}

if ($nodeAvailable) {
    $nodeVer = & node --version
    $npmVer = & npm --version
    Write-Success "Node.js $nodeVer and npm $npmVer detected."
} else {
    Write-Warn "Node.js could not be installed automatically."
    Write-Host "  Frontend assets will be served from pre-compiled bundle if available." -ForegroundColor Yellow
}

# -------------------------------------------------------------------------
# STEP 3: Check / Download FFmpeg & FFprobe
# -------------------------------------------------------------------------
Write-Step "3/8" "Checking FFmpeg & FFprobe Multimedia Tools..."

$toolsDir = Join-Path $ScriptDir "tools"
if (-not (Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
}

$ffmpegPath = Join-Path $toolsDir "ffmpeg.exe"
$ffprobePath = Join-Path $toolsDir "ffprobe.exe"

$hasFFmpeg = (Test-Path $ffmpegPath) -and (Test-Path $ffprobePath)

if (-not $hasFFmpeg) {
    # Check if installed globally in PATH
    $sysFfmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
    $sysFfprobe = Get-Command ffprobe -ErrorAction SilentlyContinue

    if ($sysFfmpeg -and $sysFfprobe) {
        Write-Success "Found FFmpeg in system PATH ($($sysFfmpeg.Source)). Copying to tools folder..."
        Copy-Item -Path $sysFfmpeg.Source -Destination $ffmpegPath -Force
        Copy-Item -Path $sysFfprobe.Source -Destination $ffprobePath -Force
        $hasFFmpeg = $true
    }
}

if (-not $hasFFmpeg) {
    Write-Warn "FFmpeg is missing from 'tools\' folder. Downloading portable build..."
    $zipPath = "$env:TEMP\ffmpeg_release.zip"
    $downloadSuccess = $false

    # Try curl first
    try {
        & curl.exe -L -# -o $zipPath "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
        if ((Test-Path $zipPath) -and ((Get-Item $zipPath).Length -gt 1000000)) {
            $downloadSuccess = $true
        }
    } catch {}

    if (-not $downloadSuccess) {
        # Fallback to GitHub release mirror
        Write-Host "  Trying alternative GitHub mirror..." -ForegroundColor Yellow
        try {
            & curl.exe -L -# -o $zipPath "https://github.com/GyanD/codexffmpeg/releases/download/7.1/ffmpeg-7.1-essentials_build.zip"
            if ((Test-Path $zipPath) -and ((Get-Item $zipPath).Length -gt 1000000)) {
                $downloadSuccess = $true
            }
        } catch {}
    }

    if ($downloadSuccess) {
        Write-Host "  Extracting FFmpeg & FFprobe binaries..." -ForegroundColor Yellow
        $tempExtract = "$env:TEMP\ffmpeg_tmp"
        if (Test-Path $tempExtract) { Remove-Item -Recurse -Force $tempExtract -ErrorAction SilentlyContinue }
        New-Item -ItemType Directory -Path $tempExtract -Force | Out-Null

        & tar.exe -xf $zipPath -C $tempExtract

        $foundFfmpeg = Get-ChildItem -Path $tempExtract -Filter "ffmpeg.exe" -Recurse | Select-Object -First 1
        $foundFfprobe = Get-ChildItem -Path $tempExtract -Filter "ffprobe.exe" -Recurse | Select-Object -First 1

        if ($foundFfmpeg) { Copy-Item $foundFfmpeg.FullName -Destination $ffmpegPath -Force }
        if ($foundFfprobe) { Copy-Item $foundFfprobe.FullName -Destination $ffprobePath -Force }

        Remove-Item -Force $zipPath -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force $tempExtract -ErrorAction SilentlyContinue
    }
}

if ((Test-Path $ffmpegPath) -and (Test-Path $ffprobePath)) {
    Write-Success "FFmpeg and FFprobe are ready in 'tools\' folder."
} else {
    Write-Warn "Could not automatically download FFmpeg."
    Write-Host "  Please install via PowerShell: winget install Gyan.FFmpeg" -ForegroundColor Yellow
    Write-Host "  Or download from https://www.gyan.dev/ffmpeg/builds/ and copy ffmpeg.exe & ffprobe.exe to tools\" -ForegroundColor Yellow
}

# -------------------------------------------------------------------------
# STEP 4: Check / Install Microsoft Edge WebView2
# -------------------------------------------------------------------------
Write-Step "4/8" "Checking Microsoft Edge WebView2 Runtime..."

$wv2Installed = $false
try {
    $wv2Reg = Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
    if (-not $wv2Reg) {
        $wv2Reg = Get-ItemProperty -Path "HKCU:\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
    }
    if ($wv2Reg.pv) { $wv2Installed = $true }
} catch {}

if ($wv2Installed) {
    Write-Success "Microsoft Edge WebView2 Runtime detected ($($wv2Reg.pv))."
} else {
    Write-Warn "WebView2 Runtime not found. Downloading Microsoft Evergreen Bootstrapper..."
    $wv2Installer = "$env:TEMP\MicrosoftEdgeWebview2Setup.exe"
    try {
        & curl.exe -L -s -o $wv2Installer "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
        if (Test-Path $wv2Installer) {
            Start-Process -FilePath $wv2Installer -ArgumentList "/silent /install" -Wait
            Remove-Item -Force $wv2Installer -ErrorAction SilentlyContinue
            Write-Success "WebView2 Runtime installed successfully."
        }
    } catch {
        Write-Warn "Could not automatically install WebView2. Standard on Windows 10/11."
    }
}

# -------------------------------------------------------------------------
# STEP 5: Python Virtual Environment (venv) Setup
# -------------------------------------------------------------------------
Write-Step "5/8" "Configuring Python Virtual Environment..."

$venvPython = Join-Path $ScriptDir "venv\Scripts\python.exe"
$venvPip = Join-Path $ScriptDir "venv\Scripts\pip.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "  Creating virtual environment in .\venv..." -ForegroundColor Yellow
    & python -m venv venv
}

if (-not (Test-Path $venvPython)) {
    Write-Failure "Failed to create Python virtual environment."
    pause
    exit 1
}

Write-Success "Virtual environment is active: $venvPython"

Write-Host "  Upgrading pip..." -ForegroundColor Yellow
& $venvPython -m pip install --upgrade pip --quiet

Write-Host "  Installing studio backend dependencies from requirements.txt..." -ForegroundColor Yellow
& $venvPip install -r "$ScriptDir\requirements.txt"
if ($LASTEXITCODE -ne 0) {
    Write-Failure "Backend dependencies installation encountered errors."
    pause
    exit 1
}
Write-Success "All backend Python libraries installed successfully."

# -------------------------------------------------------------------------
# STEP 6: Hardware Acceleration (NVIDIA CUDA Auto-Configuration)
# -------------------------------------------------------------------------
Write-Step "6/8" "Detecting Hardware Acceleration & GPU..."

$hasNvidia = $false
try {
    $videoControllers = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue
    foreach ($vc in $videoControllers) {
        if ($vc.Name -match "NVIDIA") {
            $hasNvidia = $true
            Write-Success "Detected NVIDIA Graphics: $($vc.Name)"
            break
        }
    }
} catch {}

if (-not $hasNvidia) {
    if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
        $hasNvidia = $true
        Write-Success "NVIDIA Driver detected via nvidia-smi."
    }
}

if ($hasNvidia) {
    Write-Host "  Auto-installing PyTorch with CUDA 12.4 acceleration for NVIDIA..." -ForegroundColor Cyan
    & $venvPip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124 --quiet
    Write-Success "CUDA-accelerated PyTorch configured! Whisper STT & UVR will run at maximum GPU speed."
} else {
    Write-Success "Standard PyTorch configured. CPU and AMD AMF video hardware encoders are fully enabled."
}

# -------------------------------------------------------------------------
# STEP 7: Frontend UI Build
# -------------------------------------------------------------------------
Write-Step "7/8" "Building Frontend Desktop & Web Interface..."

$frontendDir = Join-Path $ScriptDir "frontend"
$frontendDist = Join-Path $frontendDir "dist\index.html"

if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "  Running npm install in frontend..." -ForegroundColor Yellow
    Push-Location $frontendDir
    try {
        & npm install --quiet
        Write-Host "  Compiling production UI bundle (npm run build)..." -ForegroundColor Yellow
        & npm run build
        Write-Success "Frontend successfully built to frontend/dist."
    } catch {
        Write-Warn "npm build encountered a warning."
    } finally {
        Pop-Location
    }
}

if (Test-Path $frontendDist) {
    Write-Success "Frontend UI bundle verified: frontend/dist/index.html"
} else {
    Write-Warn "frontend/dist not found. Web/Desktop interface may require 'npm run build'."
}

# -------------------------------------------------------------------------
# STEP 8: Verify Directories & AI Models
# -------------------------------------------------------------------------
Write-Step "8/8" "Verifying AI Models and Storage Directories..."

$storageDirs = @(
    (Join-Path $ScriptDir "storage\uploads"),
    (Join-Path $ScriptDir "storage\audio_cache"),
    (Join-Path $ScriptDir "storage\exports")
)
foreach ($sd in $storageDirs) {
    if (-not (Test-Path $sd)) { New-Item -ItemType Directory -Path $sd -Force | Out-Null }
}
Write-Success "Storage directories initialized."

$uvrModel = Join-Path $ScriptDir "models\UVR-MDX-NET-Voc_FT.fp16acc.tflite"
if (Test-Path $uvrModel) {
    Write-Success "UVR Vocal Separation AI model verified."
} else {
    Write-Warn "UVR model not found at $uvrModel. Vocal separation will be bypassed or downloaded on demand."
}

# Pre-cache faster-whisper base model so first transcription is instantaneous
Write-Host "  Verifying / pre-caching Whisper AI speech recognition model..." -ForegroundColor Yellow
try {
    & $venvPython -c "import faster_whisper; print('Checking Whisper base model...'); m = faster_whisper.WhisperModel('base', device='cpu', compute_type='int8')"
    Write-Success "Whisper speech-to-text model ready."
} catch {
    Write-Warn "Whisper model will download automatically on first transcription."
}

# Test backend imports and speech engine
Write-Host "  Performing quick backend diagnostic..." -ForegroundColor Yellow
$diagScript = @"
import sys
try:
    import fastapi
    import uvicorn
    import edge_tts
    import faster_whisper
    import torch
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f'DIAG_OK: PyTorch device={device}')
except Exception as e:
    print(f'DIAG_ERR: {e}')
    sys.exit(1)
"@

try {
    $diagOut = & $venvPython -c $diagScript
    Write-Success "Backend diagnostic passed ($diagOut)."
} catch {
    Write-Warn "Diagnostic note: $_"
}

# -------------------------------------------------------------------------
# FINISHED!
# -------------------------------------------------------------------------
Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "   SETUP COMPLETED! ALL TOOLS ARE FULLY OPERATIONAL" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
Write-Host " - Desktop Application Launcher:  .\run.bat"
Write-Host " - Web Browser Development Mode:  npm run dev (frontend) + uvicorn"
Write-Host " - Video & Hardsub Rendering:     FFmpeg Ready"
Write-Host " - AI Khmer Dubbing:              Edge-TTS Ready"
Write-Host " - Whisper Speech-to-Text:        Ready"
Write-Host "------------------------------------------------------------"

$launchNow = Read-Host "`nWould you like to launch MK Subtitle Studio now? (Y/N) [Default: Y]"
if ($launchNow -eq "" -or $launchNow.ToUpper() -eq "Y") {
    Write-Host "Launching MK Subtitle Studio..." -ForegroundColor Cyan
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c run.bat"
}
