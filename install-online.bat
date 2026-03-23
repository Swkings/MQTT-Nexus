@echo off
REM =============================================================================
REM MQTT-Nexus 在线安装脚本 (Windows 版本)
REM =============================================================================
REM 描述：通过 PowerShell 直接下载并安装 MQTT-Nexus 应用
REM 支持：Windows (PowerShell/CMD)
REM 要求：Node.js >= 18.x, npm >= 9.x, Git
REM 用法：powershell -Command "iwr -UseBasicParsing https://raw.githubusercontent.com/Swkings/MQTT-Nexus/develop/install-online.bat | iex"
REM =============================================================================

setlocal enabledelayedexpansion

REM -----------------------------------------------------------------------------
REM 颜色定义（ANSI 转义码）
REM -----------------------------------------------------------------------------
set "RED=[0;31m"
set "GREEN=[0;32m"
set "YELLOW=[1;33m"
set "BLUE=[0;34m"
set "CYAN=[0;36m"
set "NC=[0m"

REM -----------------------------------------------------------------------------
REM 配置
REM -----------------------------------------------------------------------------
set "REPO_URL=https://github.com/Swkings/MQTT-Nexus.git"
set "BRANCH=develop"
set "INSTALL_DIR=mqtt-nexus"

REM -----------------------------------------------------------------------------
REM 输出函数
REM -----------------------------------------------------------------------------
:info
echo %BLUE%!%NC% [INFO] %NC% %~1
goto :eof

:success
echo %GREEN%!%NC% [SUCCESS] %NC% %~1
goto :eof

:warning
echo %YELLOW%!%NC% [WARNING] %NC% %~1
goto :eof

:error
echo %RED%!%NC% [ERROR] %NC% %~1
exit /b 1

:step
echo.
echo %CYAN%!%NC% [STEP] %NC% %~1
goto :eof

REM -----------------------------------------------------------------------------
REM 检查系统要求
REM -----------------------------------------------------------------------------
:check_requirements
call :step "Checking system requirements..."

where node >nul 2>nul
if %errorlevel% neq 0 (
    call :error "Node.js is not installed. Please install Node.js 18.x or higher first."
    echo Download from: https://nodejs.org/
    exit /b 1
)

for /f "tokens=2 delims=v" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "tokens=1 delims=." %%i in ("%NODE_VERSION%") do set NODE_MAJOR=%%i

if %NODE_MAJOR% LSS 18 (
    call :error "Node.js version must be 18.x or higher. Current version: !NODE_VERSION!"
    exit /b 1
)

call :success "Node.js version: !NODE_VERSION!"

where npm >nul 2>nul
if %errorlevel% neq 0 (
    call :error "npm is not installed. Please install npm first."
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
call :success "npm version: !NPM_VERSION!"

where git >nul 2>nul
if %errorlevel% neq 0 (
    call :error "Git is not installed. Please install Git first."
    exit /b 1
)

call :success "Git is available"
goto :eof

REM -----------------------------------------------------------------------------
REM 下载仓库
REM -----------------------------------------------------------------------------
:download_repo
call :step "Downloading MQTT-Nexus from %REPO_URL%..."

REM 检查目录是否已存在
if exist "%INSTALL_DIR%" (
    call :warning "Directory '%INSTALL_DIR%' already exists."
    set /p confirm="Do you want to overwrite it? (y/N): "
    if /i "!confirm!"=="y" (
        rmdir /s /q "%INSTALL_DIR%"
        call :info "Removed existing directory"
    ) else (
        call :error "Installation cancelled"
        exit /b 1
    )
)

REM 使用 git clone 下载
call :info "Cloning repository..."
git clone --depth 1 --branch %BRANCH% %REPO_URL% %INSTALL_DIR%

if %errorlevel% equ 0 (
    call :success "Repository downloaded successfully!"
) else (
    call :error "Failed to download repository"
    exit /b 1
)
goto :eof

REM -----------------------------------------------------------------------------
REM 安装依赖
REM -----------------------------------------------------------------------------
:install_dependencies
call :step "Installing dependencies..."

cd %INSTALL_DIR%

call :info "Cleaning up old node_modules (if exists)..."
if exist node_modules rmdir /s /q node_modules

call :info "Installing npm dependencies (this may take a few minutes)..."
call npm ci

if %errorlevel% equ 0 (
    call :success "Dependencies installed successfully!"
) else (
    call :error "Failed to install dependencies"
    exit /b 1
)
goto :eof

REM -----------------------------------------------------------------------------
REM 配置环境变量
REM -----------------------------------------------------------------------------
:setup_environment
call :step "Setting up environment..."

if not exist .env.local (
    call :info "Creating .env.local from .env.example..."
    copy .env.example .env.local >nul
    call :success "Environment file created: .env.local"
    call :warning "Please edit .env.local to configure your settings (optional)"
) else (
    call :info ".env.local already exists, skipping..."
)

cd ..
goto :eof

REM -----------------------------------------------------------------------------
REM 构建应用
REM -----------------------------------------------------------------------------
:build_app
call :step "Building application..."

cd %INSTALL_DIR%

call :info "Running npm build..."
call npm run build

if %errorlevel% equ 0 (
    call :success "Application built successfully!"
) else (
    call :error "Failed to build application"
    exit /b 1
)

cd ..
goto :eof

REM -----------------------------------------------------------------------------
REM 显示完成信息
REM -----------------------------------------------------------------------------
:show_completion
echo.
echo %GREEN%!%NC% ╔════════════════════════════════════════════════════════╗
echo %GREEN%!%NC% ║          MQTT-Nexus Installation Complete! 🎉           ║
echo %GREEN%!%NC% ╚════════════════════════════════════════════════════════╝
echo.

call :info "Application installed in: %CD%\%INSTALL_DIR%"
call :info "Web application built successfully!"

echo.
echo %CYAN%!%NC% Quick Start:
echo   cd %INSTALL_DIR%
echo   %YELLOW%npm run dev%NC%              REM Start development server
echo   %YELLOW%npm run build%NC%            REM Build for production
echo   %YELLOW%npm run electron:dev%NC%     REM Start Electron desktop app

echo.
echo %CYAN%!%NC% Documentation:
echo   Check README.md for more information
echo   Environment config: %INSTALL_DIR%\.env.local

echo.
echo %GREEN%!%NC% Happy coding! 🚀
echo.
goto :eof

REM -----------------------------------------------------------------------------
REM 显示使用说明
REM -----------------------------------------------------------------------------
:show_usage
echo MQTT-Nexus Online Installation Script (Windows)
echo.
echo Usage: powershell -Command "iwr -UseBasicParsing ^<script-url^> ^| iex"
echo.
echo Options:
echo   --help          Show this help message
echo.
echo Examples:
echo   REM Install from Swkings branch
echo   powershell -Command "iwr -UseBasicParsing https://raw.githubusercontent.com/Swkings/MQTT-Nexus/main/install-online.bat ^| iex"
echo.
echo   REM Install from specific branch
echo   powershell -Command "iwr -UseBasicParsing https://raw.githubusercontent.com/Swkings/MQTT-Nexus/develop/install-online.bat ^| iex"
echo.
echo Requirements:
echo   - Node.js ^>= 18.x
echo   - npm ^>= 9.x
echo   - Git
echo.
echo Alternative Installation Methods:
echo   REM Clone and install manually
echo   git clone https://github.com/Swkings/MQTT-Nexus.git
echo   cd MQTT-Nexus
echo   install.bat
echo.
goto :eof

REM -----------------------------------------------------------------------------
REM 主程序
REM -----------------------------------------------------------------------------
echo.
echo %CYAN%!%NC% ╔════════════════════════════════════════════════════════╗
echo %CYAN%!%NC% ║         MQTT-Nexus Online Installation                  ║
echo %CYAN%!%NC% ║         AI-Powered MQTT Desktop Client                  ║
echo %CYAN%!%NC% ╚════════════════════════════════════════════════════════╝
echo.

REM 解析参数
if "%~1"=="--help" call :show_usage & exit /b 0
if "%~1"=="-h" call :show_usage & exit /b 0
if not "%~1"=="" (
    call :error "Unknown option: %~1. Use --help for usage information."
)

REM 检查系统要求
call :check_requirements

REM 下载仓库
call :download_repo

REM 安装依赖
call :install_dependencies

REM 配置环境
call :setup_environment

REM 构建应用
call :build_app

REM 显示完成信息
call :show_completion

exit /b 0
