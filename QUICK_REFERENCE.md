# ⚡ MQTT-Nexus 快速参考卡片

## 🚀 快速开始

###  方式 1：在线安装（推荐 - 无需 clone）

```bash
# Linux/macOS
curl -fsSL https://raw.githubusercontent.com/swkings/MQTT-Nexus/main/install-online.sh | bash

# Windows (PowerShell)
powershell -Command "iwr -UseBasicParsing https://raw.githubusercontent.com/swkings/MQTT-Nexus/main/install-online.bat | iex"
```

###  方式 2：Clone 安装

```bash
# 1. 克隆仓库
git clone https://github.com/swkings/MQTT-Nexus.git
cd MQTT-Nexus

# 2. 一键安装
./install.sh              # Linux/macOS
# 或
install.bat               # Windows

# 3. 启动应用
./start.sh                # Linux/macOS
# 或
start.bat                 # Windows
```

---

## 📦 安装脚本选项

### install.sh / install.bat

```bash
# 完整安装（推荐）
./install.sh

# 仅安装依赖（跳过构建）
./install.sh --skip-build

# 安装并构建 Electron 桌面应用
./install.sh --electron

# 查看帮助
./install.sh --help
```

### start.sh / start.bat

```bash
# Electron 桌面模式（默认）
./start.sh

# 浏览器模式
./start.sh --browser

# 查看帮助
./start.sh --help
```

---

## 🎯 常用命令

### 开发

```bash
# Electron 开发模式
npm run electron:dev

# 浏览器开发模式
npm run dev

# 查看应用（浏览器模式）
# 访问 http://localhost:3000
```

### 构建

```bash
# 构建前端
npm run build

# 构建 Electron 应用
npm run electron:build

# 构建特定平台
npm run electron:build:win    # Windows
npm run electron:build:mac    # macOS
npm run electron:build:linux  # Linux
```

### 清理

```bash
# 清理构建产物
npm run clean
```

---

## 🔧 环境配置

### .env.local 示例

```bash
# 应用配置
VITE_APP_DEFAULT_PORT=3000
VITE_APP_DEFAULT_MQTT_PORT=1883

# Gemini API Key（可选）
GEMINI_API_KEY=your_api_key_here
```

### 获取 API Key

1. 访问：https://makersuite.google.com/app/apikey
2. 创建/登录 Google 账号
3. 创建新的 API Key
4. 添加到 `.env.local` 文件

---

## 📋 系统要求

### 必需

- ✅ Node.js >= 18.x
- ✅ npm >= 9.x

### 可选

- 🟡 Git（推荐用于克隆仓库）

### 检查版本

```bash
node -v    # 检查 Node.js
npm -v     # 检查 npm
git --version  # 检查 Git
```

---

## 🐛 快速故障排除

### 依赖安装失败

```bash
# 清理缓存
npm cache clean --force

# 删除并重新安装
rm -rf node_modules package-lock.json
npm install
```

### 权限问题（Linux/macOS）

```bash
# 修复权限
sudo chown -R $(whoami) node_modules
```

### 网络问题

```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com
npm install
```

### 查看详细日志

```bash
npm install --verbose
```

---

## 📚 文档链接

- **[README.md](README.md)** - 项目介绍和功能
- **[INSTALL.md](INSTALL.md)** - 详细安装指南
- **[ELECTRON.md](ELECTRON.md)** - Electron 开发指南
- **[MQTT_PROTOCOL_GUIDE.md](MQTT_PROTOCOL_GUIDE.md)** - MQTT 协议使用指南

---

## 🎨 协议支持

| 协议 | 端口 | 环境 | 说明 |
|------|------|------|------|
| `mqtt://` | 1883 | Electron | TCP 协议 |
| `mqtts://` | 8883 | Electron | TLS 加密 |
| `ws://` | 8083 | 全部 | WebSocket |
| `wss://` | 8084 | 全部 | 安全 WebSocket |

---

## 💡 提示

- **推荐 Electron 模式**: 完整的 MQTT 协议支持
- **浏览器模式**: 仅支持 `ws://` 和 `wss://`
- **生产环境**: 始终使用加密协议（`mqtts://` 或 `wss://`）
- **API Key**: Gemini API Key 是可选的，用于 AI 功能

---

<div align="center">

**🚀 开始构建你的 MQTT 应用吧！**

</div>
