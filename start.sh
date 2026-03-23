#!/bin/bash

# =============================================================================
# MQTT-Nexus 快速启动脚本
# =============================================================================
# 描述：快速启动 MQTT-Nexus 开发环境
# 支持：Linux、macOS、Windows (Git Bash)
# 用法：./start.sh [--electron] [--browser]
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# 颜色定义
# -----------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# 输出函数
# -----------------------------------------------------------------------------
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# -----------------------------------------------------------------------------
# 检查是否已安装
# -----------------------------------------------------------------------------
check_installation() {
    if [ ! -d "node_modules" ]; then
        warning "Dependencies not installed. Running installation..."
        ./install.sh
    fi
}

# -----------------------------------------------------------------------------
# 启动 Electron 开发模式
# -----------------------------------------------------------------------------
start_electron() {
    success "Starting MQTT-Nexus in Electron development mode..."
    info "This will launch both Vite dev server and Electron window"
    echo ""
    npm run electron:dev
}

# -----------------------------------------------------------------------------
# 启动浏览器开发模式
# -----------------------------------------------------------------------------
start_browser() {
    success "Starting MQTT-Nexus in browser mode..."
    info "Visit http://localhost:3000 in your browser"
    echo ""
    npm run dev
}

# -----------------------------------------------------------------------------
# 显示使用说明
# -----------------------------------------------------------------------------
show_usage() {
    echo "MQTT-Nexus Quick Start Script"
    echo ""
    echo "Usage: ./start.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --electron    Start in Electron desktop mode (default)"
    echo "  --browser     Start in web browser mode"
    echo "  --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./start.sh              # Start Electron mode (default)"
    echo "  ./start.sh --browser    # Start browser mode"
    echo ""
    echo "Note: Electron mode provides full MQTT protocol support"
    echo "      Browser mode only supports ws:// and wss:// protocols"
    echo ""
}

# -----------------------------------------------------------------------------
# 主程序
# -----------------------------------------------------------------------------
main() {
    echo -e "\n${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║         MQTT-Nexus Quick Start                          ║${NC}"
    echo -e "${CYAN}║         AI-Powered MQTT Desktop Client                  ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}\n"
    
    # 默认使用 Electron 模式
    USE_ELECTRON=true
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --electron)
                USE_ELECTRON=true
                shift
                ;;
            --browser)
                USE_ELECTRON=false
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1. Use --help for usage information."
                ;;
        esac
    done
    
    # 检查安装
    check_installation
    
    # 启动应用
    if [ "$USE_ELECTRON" = true ]; then
        start_electron
    else
        start_browser
    fi
}

# 运行主程序
main "$@"
