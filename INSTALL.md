# MQTT-Nexus 安装指南

本文档提供详细的安装说明和故障排除指南。

## 📋 目录

- [系统要求](#系统要求)
- [一键安装](#一键安装)
- [手动安装](#手动安装)
- [环境配置](#环境配置)
- [故障排除](#故障排除)

---

## 系统要求

### 必需软件

- **Node.js**: 18.x 或更高版本
- **npm**: 9.x 或更高版本

### 可选软件

- **Git**: 用于克隆仓库和管理版本

### 检查已安装的版本

```bash
# 检查 Node.js 版本
node -v

# 检查 npm 版本
npm -v

# 检查 Git 版本（如果已安装）
git --version
```

---

## 一键安装

###  Online Installation (在线安装 - 推荐)

无需克隆仓库，直接下载安装！

#### Linux/macOS

```bash
# 从 main 分支安装
curl -fsSL https://raw.githubusercontent.com/your-org/MQTT-Nexus/main/install-online.sh | bash

# 或使用 wget
wget -qO- https://raw.githubusercontent.com/your-org/MQTT-Nexus/main/install-online.sh | bash

# 从特定分支安装
curl -fsSL https://raw.githubusercontent.com/your-org/MQTT-Nexus/develop/install-online.sh | bash
```

#### Windows (PowerShell)

``powershell
# 从 main 分支安装（PowerShell 5.1+ 或 PowerShell 7+）
powershell -Command "iwr -UseBasicParsing https://raw.githubusercontent.com/your-org/MQTT-Nexus/main/install-online.ps1 | iex"

# 或下载后手动运行
# 1. 下载脚本
iwr -UseBasicParsing https://raw.githubusercontent.com/your-org/MQTT-Nexus/main/install-online.ps1 -OutFile install-online.ps1

# 2. 运行脚本
.\install-online.ps1
```

**注意**: `.bat` 版本仅适用于 CMD。PowerShell 请使用 `.ps1` 版本。

**在线安装特点**:
- ✅ 无需手动 clone 仓库
- ✅ 自动下载最新代码
- ✅ 自动安装依赖
- ✅ 自动构建应用
- ✅ 一键完成所有步骤

###  Clone and Install (克隆安装)

#### Linux/macOS

#### 快速安装

```bash
# 1. 克隆仓库
git clone https://github.com/your-org/MQTT-Nexus.git
cd MQTT-Nexus

# 2. 运行安装脚本
chmod +x install.sh
./install.sh
```

#### 安装选项

```bash
# 仅安装依赖（跳过构建）
./install.sh --skip-build

# 安装并构建 Electron 桌面应用
./install.sh --electron

# 查看帮助
./install.sh --help
```

### Windows

#### 快速安装

```batch
REM 1. 克隆仓库
git clone https://github.com/your-org/MQTT-Nexus.git
cd MQTT-Nexus

REM 2. 运行安装脚本
install.bat
```

#### 安装选项

```batch
REM 仅安装依赖（跳过构建）
install.bat --skip-build

REM 安装并构建 Electron 桌面应用
install.bat --electron

REM 查看帮助
install.bat --help
```

---

## 手动安装

如果自动安装脚本无法运行，请按以下步骤手动安装：

### 步骤 1：安装 Node.js

1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载并安装 LTS 版本（推荐）
3. 验证安装：
   ```bash
   node -v
   npm -v
   ```

### 步骤 2：克隆或下载项目

```bash
# 使用 Git 克隆
git clone https://github.com/your-org/MQTT-Nexus.git
cd MQTT-Nexus

# 或者下载 ZIP 文件并解压
```

### 步骤 3：安装依赖

```bash
# 清理旧的 node_modules（如果有）
rm -rf node_modules

# 安装所有依赖
npm ci
# 或者
npm install
```

### 步骤 4：配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env.local

# 编辑 .env.local 文件（可选）
# 添加你的 Gemini API Key
```

### 步骤 5：构建应用

```bash
# 构建前端应用
npm run build

# 如果构建 Electron 应用
npm run electron:build
```

---

## 环境配置

### .env.local 配置说明

创建 `.env.local` 文件（基于 `.env.example`）：

```bash
# 应用配置
VITE_APP_DEFAULT_PORT=3000
VITE_APP_DEFAULT_MQTT_PORT=1883

# Gemini API Key（可选）
GEMINI_API_KEY=your_api_key_here
```

### 配置项说明

- **VITE_APP_DEFAULT_PORT**: 开发服务器端口（默认：3000）
- **VITE_APP_DEFAULT_MQTT_PORT**: MQTT 默认端口（默认：1883）
- **GEMINI_API_KEY**: Google Gemini API Key（可选，用于 AI 功能）

### 获取 Gemini API Key

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 创建或登录 Google 账号
3. 创建新的 API Key
4. 将 API Key 添加到 `.env.local` 文件

---

## 故障排除

### 常见问题

#### 1. Node.js 版本过低

**错误信息**: `Node.js version must be 18.x or higher`

**解决方案**:
```bash
# 使用 nvm 升级 Node.js
nvm install 18
nvm use 18

# 或者从官网下载最新版本
# https://nodejs.org/
```

#### 2. npm install 失败

**错误信息**: `npm ERR! code ENOENT`

**解决方案**:
```bash
# 清理 npm 缓存
npm cache clean --force

# 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

#### 3. 构建失败

**错误信息**: `Build failed with errors`

**解决方案**:
```bash
# 查看详细错误
npm run build

# 检查 TypeScript 错误
npm run lint

# 如果是 Electron 构建失败
npm run electron:build -- --verbose
```

#### 4. 权限问题（Linux/macOS）

**错误信息**: `EACCES: permission denied`

**解决方案**:
```bash
# 修复 node_modules 权限
sudo chown -R $(whoami) node_modules

# 或者使用 nvm 避免权限问题
# https://github.com/nvm-sh/nvm
```

#### 5. Windows 路径过长

**错误信息**: `EPERM: operation not permitted`

**解决方案**:
```batch
REM 以管理员身份运行 CMD 或 PowerShell

REM 启用长路径支持
reg add HKLM\SYSTEM\CurrentControlSet\Control\FileSystem /v LongPathsEnabled /t REG_DWORD /d 1 /f

REM 重启计算机
```

#### 6. 网络问题导致依赖安装失败

**错误信息**: `npm ERR! network timeout`

**解决方案**:
```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com

# 重新安装
npm install
```

### 获取帮助

如果以上方法无法解决问题：

1. **查看详细日志**:
   ```bash
   npm install --verbose
   ```

2. **检查系统日志**:
   ```bash
   # Linux/macOS
   dmesg | tail
   
   # Windows
   # 查看事件查看器
   ```

3. **提交 Issue**:
   - 访问项目 GitHub 页面
   - 提供详细的错误信息和系统环境
   - 附上日志输出

---

## 验证安装

### 检查安装是否成功

```bash
# 1. 检查依赖是否安装
ls node_modules  # Linux/macOS
dir node_modules # Windows

# 2. 运行开发服务器
npm run dev

# 3. 访问应用
# 浏览器模式：http://localhost:3000
```

### 测试 Electron 应用

```bash
# 启动 Electron 开发模式
npm run electron:dev

# 应该看到 Electron 窗口打开
```

---

## 下一步

安装成功后，请参考：

- **[README.md](README.md)** - 项目介绍和快速开始
- **[ELECTRON.md](ELECTRON.md)** - Electron 开发指南
- **[MQTT_PROTOCOL_GUIDE.md](MQTT_PROTOCOL_GUIDE.md)** - MQTT 协议使用指南

---

<div align="center">

**Happy coding! 🚀**

</div>
