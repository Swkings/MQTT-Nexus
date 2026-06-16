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
REPO_URL="https://github.com/swkings/MQTT-Nexus.git"
BRANCH="main"
INSTALL_DIR="./mqtt-nexus"
BUILD_ELECTRON=true  # ✅ 默认构建 Electron 桌面应用

# -----------------------------------------------------------------------------
# 构建 Electron 应用
# -----------------------------------------------------------------------------
build_electron() {
    step "Building Electron desktop application..."
    
    cd "$INSTALL_DIR"
    
    info "Compiling Electron TypeScript..."
    npx tsc -p electron/tsconfig.json
    
    if [ $? -ne 0 ]; then
        error "Failed to compile Electron"
    fi
    
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
    
    if [ $? -eq 0 ]; then
        success "Electron application built successfully!"
        info "Installer location: $INSTALL_DIR/release/"
    else
        error "Failed to build Electron package"
    fi
    
    cd ..
}

# -----------------------------------------------------------------------------
# 安装 Electron 应用到系统
# -----------------------------------------------------------------------------
run_privileged() {
    if [ "$(id -u)" -eq 0 ]; then
        "$@"
    elif command -v sudo >/dev/null 2>&1; then
        sudo "$@"
    else
        warning "This install step requires root privileges. Re-run with sudo or install the package manually."
        return 1
    fi
}

install_electron_package() {
    if [ "$BUILD_ELECTRON" != true ]; then
        return 0
    fi

    step "Installing Electron desktop application..."

    if [ "$OS" = "linux" ]; then
        local deb_pkg rpm_pkg
        deb_pkg=$(ls -t "$INSTALL_DIR"/release/*.deb 2>/dev/null | head -n 1 || true)
        rpm_pkg=$(ls -t "$INSTALL_DIR"/release/*.rpm 2>/dev/null | head -n 1 || true)

        if [ -n "$deb_pkg" ]; then
            info "Installing Debian package: $deb_pkg"
            if command -v apt >/dev/null 2>&1; then
                run_privileged apt install -y "./$deb_pkg"
            elif command -v apt-get >/dev/null 2>&1; then
                run_privileged dpkg -i "$deb_pkg" || run_privileged apt-get install -f -y
            elif command -v dpkg >/dev/null 2>&1; then
                run_privileged dpkg -i "$deb_pkg"
            else
                warning "No supported Debian package installer found. Install manually: sudo dpkg -i $deb_pkg"
                return 0
            fi
            success "Desktop application installed successfully!"
            return 0
        fi

        if [ -n "$rpm_pkg" ]; then
            info "Installing RPM package: $rpm_pkg"
            if command -v dnf >/dev/null 2>&1; then
                run_privileged dnf install -y "$rpm_pkg"
            elif command -v yum >/dev/null 2>&1; then
                run_privileged yum install -y "$rpm_pkg"
            elif command -v rpm >/dev/null 2>&1; then
                run_privileged rpm -Uvh "$rpm_pkg"
            else
                warning "No supported RPM package installer found. Install manually: sudo rpm -Uvh $rpm_pkg"
                return 0
            fi
            success "Desktop application installed successfully!"
            return 0
        fi

        warning "No .deb or .rpm package found in $INSTALL_DIR/release/."
    elif [ "$OS" = "macos" ]; then
        local dmg_pkg mount_point app_path
        dmg_pkg=$(ls -t "$INSTALL_DIR"/release/*.dmg 2>/dev/null | head -n 1 || true)
        if [ -z "$dmg_pkg" ]; then
            warning "No .dmg package found in $INSTALL_DIR/release/."
            return 0
        fi

        info "Mounting DMG package: $dmg_pkg"
        mount_point=$(hdiutil attach "$dmg_pkg" -nobrowse | awk '/\/Volumes\// {print substr($0, index($0, "/Volumes/")); exit}')
        if [ -z "$mount_point" ]; then
            warning "Failed to mount DMG. Install manually: open $dmg_pkg"
            return 0
        fi

        app_path=$(find "$mount_point" -maxdepth 1 -name "*.app" -print -quit)
        if [ -n "$app_path" ]; then
            info "Copying $(basename "$app_path") to /Applications..."
            run_privileged cp -R "$app_path" /Applications/
            success "Desktop application installed successfully!"
        else
            warning "No .app found in mounted DMG. Install manually: open $dmg_pkg"
        fi
        hdiutil detach "$mount_point" -quiet || true
    elif [ "$OS" = "windows" ]; then
        local exe_pkg
        exe_pkg=$(ls -t "$INSTALL_DIR"/release/*Setup*.exe "$INSTALL_DIR"/release/*.exe 2>/dev/null | head -n 1 || true)
        if [ -n "$exe_pkg" ]; then
            info "Starting Windows installer: $exe_pkg"
            "$exe_pkg"
            success "Desktop installer completed."
        else
            warning "No Windows installer found in $INSTALL_DIR/release/."
        fi
    else
        warning "Automatic system install is not supported for OS: $OS"
    fi
}

# -----------------------------------------------------------------------------
# 显示完成信息
# -----------------------------------------------------------------------------
show_completion() {
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          MQTT-Nexus Installation Complete! 🎉           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}\n"
    
    info "Application installed in: $(pwd)/$INSTALL_DIR"
    
    if [ "$BUILD_ELECTRON" = true ]; then
        info "Desktop application built and installed successfully!"
        info "Installers are available in: $INSTALL_DIR/release/"
        echo -e "\n${CYAN}Quick Start:${NC}"
        echo -e "  cd $INSTALL_DIR"
        echo -e "  ${YELLOW}Run Desktop App:${NC}    ./release/MQTT-Nexus[version].[ext]"
        echo -e "  ${YELLOW}Development Mode:${NC}   npm run electron:dev"
        echo -e "  ${YELLOW}Rebuild App:${NC}        npm run electron:build"
    else
        info "Web application built successfully!"
        echo -e "\n${CYAN}Quick Start:${NC}"
        echo -e "  cd $INSTALL_DIR"
        echo -e "  ${YELLOW}npm run dev${NC}              # Start development server"
        echo -e "  ${YELLOW}npm run build${NC}            # Build for production"
        echo -e "  ${YELLOW}npm run electron:build${NC}   # Build desktop app"
    fi
    
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
    echo "  --no-electron     Skip Electron desktop application build (web only)"
    echo "  --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  # Install with Electron desktop app (default)"
    echo "  curl -fsSL https://raw.githubusercontent.com/swkings/MQTT-Nexus/main/install-online.sh | bash"
    echo ""
    echo "  # Install web version only"
    echo "  curl -fsSL https://raw.githubusercontent.com/swkings/MQTT-Nexus/main/install-online.sh | bash -s -- --no-electron"
    echo ""
    echo "Requirements:"
    echo "  - Node.js >= 18.x"
    echo "  - npm >= 9.x"
    echo "  - Git"
    echo "  - curl or wget"
    echo ""
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
            --no-electron)
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
    
    # 下载仓库
    download_repo
    
    # 安装依赖
    install_dependencies
    
    # 配置环境
    setup_environment
    
    # 构建应用
    build_app
    
    # 构建 Electron 应用
    if [ "$BUILD_ELECTRON" = true ]; then
        build_electron
        install_electron_package
    fi
    
    # 显示完成信息
    show_completion
}

# 运行主程序
main "$@"
