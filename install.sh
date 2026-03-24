#!/bin/bash

# =============================================================================
# MQTT-Nexus 一键安装脚本
# =============================================================================
# 描述：自动安装 MQTT-Nexus 应用的所有依赖并完成构建
# 支持：Linux、macOS、Windows (Git Bash)
# 要求：Node.js >= 18.x, npm >= 9.x
# 用法：./install.sh [--skip-build] [--electron]
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

step() {
    echo -e "\n${CYAN}[STEP]${NC} $1"
}

# -----------------------------------------------------------------------------
# 检测操作系统
# -----------------------------------------------------------------------------
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        OS="windows"
    else
        warning "Unknown OS: $OSTYPE"
        OS="unknown"
    fi
    info "Detected OS: $OS ($OSTYPE)"
}

# -----------------------------------------------------------------------------
# 检查系统要求
# -----------------------------------------------------------------------------
check_requirements() {
    step "Checking system requirements..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18.x or higher first.\nDownload from: https://nodejs.org/"
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version must be 18.x or higher. Current version: $(node -v)"
    fi
    success "Node.js version: $(node -v)"
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed. Please install npm first."
    fi
    NPM_VERSION=$(npm -v)
    success "npm version: $NPM_VERSION"
    
    # 检查 Git（可选）
    if command -v git &> /dev/null; then
        success "Git version: $(git --version)"
    else
        warning "Git is not installed. Some features may be limited."
    fi
}

# -----------------------------------------------------------------------------
# 安装依赖
# -----------------------------------------------------------------------------
install_dependencies() {
    step "Installing dependencies..."
    
    info "Cleaning up old node_modules (if exists)..."
    rm -rf node_modules
    
    info "Installing npm dependencies (this may take a few minutes)..."
    npm ci
    
    success "Dependencies installed successfully!"
}

# -----------------------------------------------------------------------------
# 配置环境变量
# -----------------------------------------------------------------------------
setup_environment() {
    step "Setting up environment..."
    
    if [ ! -f ".env.local" ]; then
        info "Creating .env.local from .env.example..."
        cp .env.example .env.local
        success "Environment file created: .env.local"
        warning "Please edit .env.local to configure your settings (optional)"
    else
        info ".env.local already exists, skipping..."
    fi
}

# -----------------------------------------------------------------------------
# 构建应用
# -----------------------------------------------------------------------------
build_app() {
    step "Building application..."
    
    info "Running npm build..."
    npm run build
    
    success "Application built successfully!"
}

# -----------------------------------------------------------------------------
# 构建 Electron 应用（可选）
# -----------------------------------------------------------------------------
build_electron() {
    step "Building Electron desktop application..."
    
    info "Compiling Electron TypeScript..."
    npx tsc -p electron/tsconfig.json
    
    info "Building Electron package for current platform..."
    if [ "$OS" == "linux" ]; then
        npm run electron:build:linux
    elif [ "$OS" == "macos" ]; then
        npm run electron:build:mac
    elif [ "$OS" == "windows" ]; then
        npm run electron:build:win
    else
        npm run electron:build
    fi
    
    success "Electron application built successfully!"
    info "Installer location: ./release/"
}

# -----------------------------------------------------------------------------
# 显示完成信息
# -----------------------------------------------------------------------------
show_completion() {
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          MQTT-Nexus Installation Complete! 🎉           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}\n"
    
    if [ "$BUILD_ELECTRON" = true ]; then
        info "Desktop application built successfully!"
        info "Installers are available in: ./release/"
        echo -e "\n${CYAN}Quick Start:${NC}"
        echo -e "  ${YELLOW}Run Desktop App:${NC}    ./release/MQTT-Nexus[version].[ext]"
        echo -e "  ${YELLOW}Development Mode:${NC}   npm run electron:dev"
        echo -e "  ${YELLOW}Rebuild App:${NC}        npm run electron:build"
    else
        info "Web application built successfully!"
        info "To run development server: npm run dev"
        info "To build Electron app: npm run electron:build"
        echo -e "\n${CYAN}Quick Start:${NC}"
        echo -e "  ${YELLOW}Development:${NC}   npm run dev"
        echo -e "  ${YELLOW}Production:${NC}    npm run build && npm run preview"
        echo -e "  ${YELLOW}Desktop App:${NC}   npm run electron:build"
    fi
    
    echo -e "\n${CYAN}Documentation:${NC}"
    echo -e "  Check README.md for more information"
    echo -e "  Environment config: .env.local"
    
    echo -e "\n${GREEN}Happy coding! 🚀${NC}\n"
}

# -----------------------------------------------------------------------------
# 显示使用说明
# -----------------------------------------------------------------------------
show_usage() {
    echo "MQTT-Nexus Installation Script"
    echo ""
    echo "Usage: ./install.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --skip-build      Skip the build step (only install dependencies)"
    echo "  --no-electron     Skip Electron desktop application build (web only)"
    echo "  --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./install.sh                    # Full installation with Electron app (default)"
    echo "  ./install.sh --skip-build       # Only install dependencies"
    echo "  ./install.sh --no-electron      # Build web version only"
    echo ""
    echo "Requirements:"
    echo "  - Node.js >= 18.x"
    echo "  - npm >= 9.x"
    echo "  - Git (optional)"
    echo ""
}

# -----------------------------------------------------------------------------
# 主程序
# -----------------------------------------------------------------------------
main() {
    echo -e "\n${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║         MQTT-Nexus Installation Script                  ║${NC}"
    echo -e "${CYAN}║         AI-Powered MQTT Desktop Client                  ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}\n"
    
    # 解析参数
    SKIP_BUILD=false
    BUILD_ELECTRON=true  # ✅ 默认构建 Electron 桌面应用
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --no-electron)  # ✅ 修改为 --no-electron 表示不构建 Electron
                BUILD_ELECTRON=false
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
    
    # 检测操作系统
    detect_os
    
    # 检查系统要求
    check_requirements
    
    # 安装依赖
    install_dependencies
    
    # 配置环境
    setup_environment
    
    # 构建应用
    if [ "$SKIP_BUILD" = false ]; then
        build_app
        
        # 构建 Electron（默认执行）
        if [ "$BUILD_ELECTRON" = true ]; then
            build_electron
        fi
    else
        warning "Skipping build step as requested"
    fi
    
    # 显示完成信息
    show_completion
}

# 运行主程序
main "$@"
