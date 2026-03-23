#!/bin/bash

# =============================================================================
# MQTT-Nexus 在线安装脚本
# =============================================================================
# 描述：通过 curl/wget 直接下载并安装 MQTT-Nexus 应用
# 支持：Linux、macOS、Windows (Git Bash)
# 要求：Node.js >= 18.x, npm >= 9.x, Git
# 用法：curl -fsSL https://raw.githubusercontent.com/Swkings/MQTT-Nexus/develop/install-online.sh | bash
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
# 配置
# -----------------------------------------------------------------------------
REPO_URL="https://github.com/Swkings/MQTT-Nexus.git"
BRANCH="develop"
INSTALL_DIR="./mqtt-nexus"

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
    
    # 检查 Git
    if ! command -v git &> /dev/null; then
        error "Git is not installed. Please install Git first."
    fi
    success "Git version: $(git --version)"
    
    # 检查 curl 或 wget
    if ! command -v curl &> /dev/null && ! command -v wget &> /dev/null; then
        error "Neither curl nor wget is installed. Please install one of them."
    fi
    
    if command -v curl &> /dev/null; then
        DOWNLOADER="curl"
        success "curl is available"
    else
        DOWNLOADER="wget"
        success "wget is available"
    fi
}

# -----------------------------------------------------------------------------
# 下载仓库
# -----------------------------------------------------------------------------
download_repo() {
    step "Downloading MQTT-Nexus from $REPO_URL..."
    
    # 检查目录是否已存在
    if [ -d "$INSTALL_DIR" ]; then
        warning "Directory '$INSTALL_DIR' already exists."
        read -p "Do you want to overwrite it? (y/N): " confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            rm -rf "$INSTALL_DIR"
            info "Removed existing directory"
        else
            error "Installation cancelled"
        fi
    fi
    
    # 使用 git clone 下载
    info "Cloning repository..."
    git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    
    if [ $? -eq 0 ]; then
        success "Repository downloaded successfully!"
    else
        error "Failed to download repository"
    fi
}

# -----------------------------------------------------------------------------
# 安装依赖
# -----------------------------------------------------------------------------
install_dependencies() {
    step "Installing dependencies..."
    
    cd "$INSTALL_DIR"
    
    info "Cleaning up old node_modules (if exists)..."
    rm -rf node_modules
    
    info "Installing npm dependencies (this may take a few minutes)..."
    npm ci
    
    if [ $? -eq 0 ]; then
        success "Dependencies installed successfully!"
    else
        error "Failed to install dependencies"
    fi
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
    
    cd ..
}

# -----------------------------------------------------------------------------
# 构建应用
# -----------------------------------------------------------------------------
build_app() {
    step "Building application..."
    
    cd "$INSTALL_DIR"
    
    info "Running npm build..."
    npm run build
    
    if [ $? -eq 0 ]; then
        success "Application built successfully!"
    else
        error "Failed to build application"
    fi
    
    cd ..
}

# -----------------------------------------------------------------------------
# 显示完成信息
# -----------------------------------------------------------------------------
show_completion() {
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          MQTT-Nexus Installation Complete! 🎉           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}\n"
    
    info "Application installed in: $(pwd)/$INSTALL_DIR"
    info "Web application built successfully!"
    
    echo -e "\n${CYAN}Quick Start:${NC}"
    echo -e "  cd $INSTALL_DIR"
    echo -e "  ${YELLOW}npm run dev${NC}              # Start development server"
    echo -e "  ${YELLOW}npm run build${NC}            # Build for production"
    echo -e "  ${YELLOW}npm run electron:dev${NC}     # Start Electron desktop app"
    
    echo -e "\n${CYAN}Documentation:${NC}"
    echo -e "  Check README.md for more information"
    echo -e "  Environment config: $INSTALL_DIR/.env.local"
    
    echo -e "\n${GREEN}Happy coding! 🚀${NC}\n"
}

# -----------------------------------------------------------------------------
# 显示使用说明
# -----------------------------------------------------------------------------
show_usage() {
    echo "MQTT-Nexus Online Installation Script"
    echo ""
    echo "Usage: curl -fsSL <script-url> | bash"
    echo ""
    echo "Options:"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  # Install from main branch"
    echo "  curl -fsSL https://raw.githubusercontent.com/Swkings/MQTT-Nexus/main/install-online.sh | bash"
    echo ""
    echo "  # Install from specific branch"
    echo "  curl -fsSL https://raw.githubusercontent.com/Swkings/MQTT-Nexus/develop/install-online.sh | bash"
    echo ""
    echo "Requirements:"
    echo "  - Node.js >= 18.x"
    echo "  - npm >= 9.x"
    echo "  - Git"
    echo "  - curl or wget"
    echo ""
    echo "Alternative Installation Methods:"
    echo "  # Clone and install manually"
    echo "  git clone https://github.com/Swkings/MQTT-Nexus.git"
    echo "  cd MQTT-Nexus"
    echo "  ./install.sh"
    echo ""
}

# -----------------------------------------------------------------------------
# 主程序
# -----------------------------------------------------------------------------
main() {
    echo -e "\n${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║         MQTT-Nexus Online Installation                  ║${NC}"
    echo -e "${CYAN}║         AI-Powered MQTT Desktop Client                  ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}\n"
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
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
    
    # 下载仓库
    download_repo
    
    # 安装依赖
    install_dependencies
    
    # 配置环境
    setup_environment
    
    # 构建应用
    build_app
    
    # 显示完成信息
    show_completion
}

# 运行主程序
main "$@"
