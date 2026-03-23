@echo off
REM =============================================================================
REM MQTT-Nexus 快速启动脚本 (Windows 版本)
REM =============================================================================
REM 描述：快速启动 MQTT-Nexus 开发环境
REM 支持：Windows (PowerShell/CMD)
REM 用法：start.bat [--electron] [--browser]
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

REM -----------------------------------------------------------------------------
REM 检查是否已安装
REM -----------------------------------------------------------------------------
:check_installation
if not exist node_modules (
    call :warning "Dependencies not installed. Running installation..."
    call install.bat
)
goto :eof

REM -----------------------------------------------------------------------------
REM 启动 Electron 开发模式
REM -----------------------------------------------------------------------------
:start_electron
call :success "Starting MQTT-Nexus in Electron development mode..."
call :info "This will launch both Vite dev server and Electron window"
echo.
call npm run electron:dev
goto :eof

REM -----------------------------------------------------------------------------
REM 启动浏览器开发模式
REM -----------------------------------------------------------------------------
:start_browser
call :success "Starting MQTT-Nexus in browser mode..."
call :info "Visit http://localhost:3000 in your browser"
echo.
call npm run dev
goto :eof

REM -----------------------------------------------------------------------------
REM 显示使用说明
REM -----------------------------------------------------------------------------
:show_usage
echo MQTT-Nexus Quick Start Script (Windows)
echo.
echo Usage: start.bat [OPTIONS]
echo.
echo Options:
echo   --electron    Start in Electron desktop mode ^(default^)
echo   --browser     Start in web browser mode
echo   --help        Show this help message
echo.
echo Examples:
echo   start.bat              Start Electron mode ^(default^)
echo   start.bat --browser    Start browser mode
echo.
echo Note: Electron mode provides full MQTT protocol support
echo       Browser mode only supports ws:// and wss:// protocols
echo.
goto :eof

REM -----------------------------------------------------------------------------
REM 主程序
REM -----------------------------------------------------------------------------
echo.
echo %CYAN%!%NC% ╔════════════════════════════════════════════════════════╗
echo %CYAN%!%NC% ║         MQTT-Nexus Quick Start                          ║
echo %CYAN%!%NC% ║         AI-Powered MQTT Desktop Client                  ║
echo %CYAN%!%NC% ╚════════════════════════════════════════════════════════╝
echo.

REM 默认使用 Electron 模式
set USE_ELECTRON=true

REM 解析参数
:parse_args
if "%~1"=="" goto :main
if /i "%~1"=="--electron" set USE_ELECTRON=true & shift & goto :parse_args
if /i "%~1"=="--browser" set USE_ELECTRON=false & shift & goto :parse_args
if /i "%~1"=="--help" call :show_usage & exit /b 0
call :error "Unknown option: %~1. Use --help for usage information."

:main
REM 检查安装
call :check_installation

REM 启动应用
if "%USE_ELECTRON%"=="true" (
    call :start_electron
) else (
    call :start_browser
)

exit /b 0
