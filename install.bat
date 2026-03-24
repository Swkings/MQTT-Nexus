@echo off
REM =============================================================================
REM MQTT-Nexus 一键安装脚本 (Windows 版本)
REM =============================================================================
REM 描述：自动安装 MQTT-Nexus 应用的所有依赖并完成构建
REM 支持：Windows (PowerShell/CMD)
REM 要求：Node.js >= 18.x, npm >= 9.x
REM 用法：install.bat [--skip-build] [--electron]
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
REM 检查 Node.js 和 npm
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

goto :eof

REM -----------------------------------------------------------------------------
REM 安装依赖
REM -----------------------------------------------------------------------------
:install_dependencies
call :step "Installing dependencies..."

call :info "Cleaning up old node_modules (if exists)..."
if exist node_modules rmdir /s /q node_modules

call :info "Installing npm dependencies (this may take a few minutes)..."
call npm ci
if %errorlevel% neq 0 (
    call :error "Failed to install dependencies"
    exit /b 1
)

call :success "Dependencies installed successfully!"
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
goto :eof

REM -----------------------------------------------------------------------------
REM 构建应用
REM -----------------------------------------------------------------------------
:build_app
call :step "Building application..."

call :info "Running npm build..."
call npm run build
if %errorlevel% neq 0 (
    call :error "Failed to build application"
    exit /b 1
)

call :success "Application built successfully!"
goto :eof

REM -----------------------------------------------------------------------------
REM 构建 Electron 应用
REM -----------------------------------------------------------------------------
:build_electron
call :step "Building Electron desktop application..."

call :info "Compiling Electron TypeScript..."
call npx tsc -p electron/tsconfig.json
if %errorlevel% neq 0 (
    call :error "Failed to compile Electron"
    exit /b 1
)

call :info "Building Electron package for Windows..."
call npm run electron:build:win
if %errorlevel% neq 0 (
    call :error "Failed to build Electron package"
    exit /b 1
)

call :success "Electron application built successfully!"
call :info "Installer location: .\release\"
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

if "%BUILD_ELECTRON%"=="true" (
    call :info "Desktop application built successfully!"
    call :info "Installers are available in: .\release\"
    echo.
    echo %CYAN%!%NC% Quick Start:
    echo   %YELLOW%!%NC% Run Desktop App:    .\release\MQTT-Nexus[version].[ext]
    echo   %YELLOW%!%NC% Development Mode:   npm run electron:dev
    echo   %YELLOW%!%NC% Rebuild App:        npm run electron:build
) else (
    call :info "Web application built successfully!"
    call :info "To run development server: npm run dev"
    call :info "To build Electron app: npm run electron:build"
    echo.
    echo %CYAN%!%NC% Quick Start:
    echo   %YELLOW%!%NC% Development:   npm run dev
    echo   %YELLOW%!%NC% Production:    npm run build ^&^& npm run preview
    echo   %YELLOW%!%NC% Desktop App:   npm run electron:build
)

echo.
echo %CYAN%!%NC% Documentation:
echo   Check README.md for more information
echo   Environment config: .env.local

echo.
echo %GREEN%!%NC% Happy coding! 🚀
echo.
goto :eof

REM -----------------------------------------------------------------------------
REM 显示使用说明
REM -----------------------------------------------------------------------------
:show_usage
echo MQTT-Nexus Installation Script (Windows)
echo.
echo Usage: install.bat [OPTIONS]
echo.
echo Options:
echo   --skip-build      Skip the build step ^(only install dependencies^)
echo   --no-electron     Skip Electron desktop application build ^(web only^)
echo   --help            Show this help message
echo.
echo Examples:
echo   install.bat                    Full installation with Electron app ^(default^)
echo   install.bat --skip-build       Only install dependencies
echo   install.bat --no-electron      Build web version only
echo.
echo Requirements:
echo   - Node.js ^>= 18.x
echo   - npm ^>= 9.x
echo   - Git ^(optional^)
echo.
goto :eof

REM -----------------------------------------------------------------------------
REM 主程序
REM -----------------------------------------------------------------------------
echo.
echo %CYAN%!%NC% ╔════════════════════════════════════════════════════════╗
echo %CYAN%!%NC% ║         MQTT-Nexus Installation Script                  ║
echo %CYAN%!%NC% ║         AI-Powered MQTT Desktop Client                  ║
echo %CYAN%!%NC% ╚════════════════════════════════════════════════════════╝
echo.

REM 解析参数
set SKIP_BUILD=false
set BUILD_ELECTRON=true  REM ✅ 默认构建 Electron 桌面应用

:parse_args
if "%~1"=="" goto :main
if /i "%~1"=="--skip-build" set SKIP_BUILD=true & shift & goto :parse_args
if /i "%~1"=="--no-electron" set BUILD_ELECTRON=false & shift & goto :parse_args
if /i "%~1"=="--help" call :show_usage & exit /b 0
call :error "Unknown option: %~1. Use --help for usage information."

:main
REM 检查系统要求
call :check_requirements

REM 安装依赖
call :install_dependencies

REM 配置环境
call :setup_environment

REM 构建应用
if "%SKIP_BUILD%"=="false" (
    call :build_app
    
    REM 构建 Electron（默认执行）
    if "%BUILD_ELECTRON%"=="true" (
        call :build_electron
    )
) else (
    call :warning "Skipping build step as requested"
)

REM 显示完成信息
call :show_completion

exit /b 0
