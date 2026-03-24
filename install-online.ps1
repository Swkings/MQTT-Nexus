# =============================================================================
# MQTT-Nexus 在线安装脚本 (PowerShell 版本)
# =============================================================================
# 描述：通过 PowerShell 直接下载并安装 MQTT-Nexus 应用
# 支持：Windows (PowerShell 5.1+ / PowerShell 7+)
# 要求：Node.js >= 18.x, npm >= 9.x, Git
# 用法：powershell -Command "iwr -UseBasicParsing https://raw.githubusercontent.com/your-org/MQTT-Nexus/main/install-online.ps1 | iex"
# =============================================================================

# -----------------------------------------------------------------------------
# 配置
# -----------------------------------------------------------------------------
$RepoUrl = "https://github.com/your-org/MQTT-Nexus.git"
$Branch = "main"
$InstallDir = ".\mqtt-nexus"
$BuildElectron = $true  # ✅ 默认构建 Electron 桌面应用

# -----------------------------------------------------------------------------
# 构建 Electron 应用
# -----------------------------------------------------------------------------
function Build-Electron {
    Write-Step "Building Electron desktop application..."
    
    Set-Location $InstallDir
    
    Write-Info "Compiling Electron TypeScript..."
    try {
        npx tsc -p electron/tsconfig.json 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Electron compilation failed"
        }
    } catch {
        Write-Error "Failed to compile Electron"
    }
    
    Write-Info "Building Electron package for Windows..."
    try {
        npm run electron:build:win 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Electron application built successfully!"
            Write-Info "Installer location: $InstallDir\release\"
        } else {
            throw "Electron build failed"
        }
    } catch {
        Write-Error "Failed to build Electron package"
    }
    
    Set-Location ..
}

# -----------------------------------------------------------------------------
# 颜色输出函数
# -----------------------------------------------------------------------------
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    exit 1
}

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "[STEP] $Message" -ForegroundColor Magenta
}

# -----------------------------------------------------------------------------
# 显示横幅
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         MQTT-Nexus Online Installation                  ║" -ForegroundColor Cyan
Write-Host "║         AI-Powered MQTT Desktop Client                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------------------------------------
# 检查系统要求
# -----------------------------------------------------------------------------
Write-Step "Checking system requirements..."

# 检查 Node.js
try {
    $nodeVersion = node -v 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js not found"
    }
    $nodeMajor = [int]($nodeVersion -replace 'v', '').Split('.')[0]
    if ($nodeMajor -lt 18) {
        Write-Error "Node.js version must be 18.x or higher. Current version: $nodeVersion"
    }
    Write-Success "Node.js version: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed. Please install Node.js 18.x or higher first.`nDownload from: https://nodejs.org/"
}

# 检查 npm
try {
    $npmVersion = npm -v 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "npm not found"
    }
    Write-Success "npm version: $npmVersion"
} catch {
    Write-Error "npm is not installed. Please install npm first."
}

# 检查 Git
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Git not found"
    }
    Write-Success "Git version: $gitVersion"
} catch {
    Write-Error "Git is not installed. Please install Git first."
}

# -----------------------------------------------------------------------------
# 下载仓库
# -----------------------------------------------------------------------------
Write-Step "Downloading MQTT-Nexus from $RepoUrl..."

# 检查目录是否已存在
if (Test-Path $InstallDir) {
    Write-Warning "Directory '$InstallDir' already exists."
    $confirm = Read-Host "Do you want to overwrite it? (y/N)"
    if ($confirm -eq "y" -or $confirm -eq "Y") {
        Remove-Item -Recurse -Force $InstallDir
        Write-Info "Removed existing directory"
    } else {
        Write-Error "Installation cancelled"
    }
}

# 使用 git clone 下载
Write-Info "Cloning repository..."
try {
    git clone --depth 1 --branch $Branch $RepoUrl $InstallDir 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Repository downloaded successfully!"
    } else {
        throw "git clone failed"
    }
} catch {
    Write-Error "Failed to download repository"
}

# -----------------------------------------------------------------------------
# 安装依赖
# -----------------------------------------------------------------------------
Write-Step "Installing dependencies..."

Set-Location $InstallDir

Write-Info "Cleaning up old node_modules (if exists)..."
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
}

Write-Info "Installing npm dependencies (this may take a few minutes)..."
try {
    npm ci 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencies installed successfully!"
    } else {
        throw "npm ci failed"
    }
} catch {
    Write-Error "Failed to install dependencies"
}

# -----------------------------------------------------------------------------
# 配置环境变量
# -----------------------------------------------------------------------------
Write-Step "Setting up environment..."

if (-not (Test-Path ".env.local")) {
    Write-Info "Creating .env.local from .env.example..."
    Copy-Item ".env.example" ".env.local"
    Write-Success "Environment file created: .env.local"
    Write-Warning "Please edit .env.local to configure your settings (optional)"
} else {
    Write-Info ".env.local already exists, skipping..."
}

Set-Location ..

# -----------------------------------------------------------------------------
# 构建应用
# -----------------------------------------------------------------------------
Write-Step "Building application..."

Set-Location $InstallDir

Write-Info "Running npm build..."
try {
    npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Application built successfully!"
    } else {
        throw "npm build failed"
    }
} catch {
    Write-Error "Failed to build application"
}

Set-Location ..

# -----------------------------------------------------------------------------
# 构建 Electron 应用（默认执行）
# -----------------------------------------------------------------------------
if ($BuildElectron) {
    Build-Electron
}

# -----------------------------------------------------------------------------
# 显示完成信息
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║          MQTT-Nexus Installation Complete! 🎉           ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Info "Application installed in: $(Get-Location)\$InstallDir"

if ($BuildElectron) {
    Write-Info "Desktop application built successfully!"
    Write-Info "Installers are available in: $InstallDir\release\"
    Write-Host ""
    Write-Host "Quick Start:" -ForegroundColor Cyan
    Write-Host "  cd $InstallDir"
    Write-Host "  Run Desktop App:    .\release\MQTT-Nexus[version].[ext]" -ForegroundColor Yellow
    Write-Host "  Development Mode:   npm run electron:dev" -ForegroundColor Yellow
    Write-Host "  Rebuild App:        npm run electron:build" -ForegroundColor Yellow
} else {
    Write-Info "Web application built successfully!"
    Write-Host ""
    Write-Host "Quick Start:" -ForegroundColor Cyan
    Write-Host "  cd $InstallDir"
    Write-Host "  npm run dev              # Start development server" -ForegroundColor Yellow
    Write-Host "  npm run build            # Build for production" -ForegroundColor Yellow
    Write-Host "  npm run electron:build   # Build desktop app" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "  Check README.md for more information"
Write-Host "  Environment config: $InstallDir\.env.local"

Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Green
Write-Host ""
