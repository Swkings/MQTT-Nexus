# ⚡ MQTT-Nexus 在线安装指南

## 🚀 一键在线安装（推荐）

无需 clone 仓库，一条命令即可完成安装！

### Linux/macOS

```bash
# 从 main 分支安装（推荐）
curl -fsSL https://raw.githubusercontent.com/swkings/MQTT-Nexus/main/install-online.sh | bash

# 或使用 wget
wget -qO- https://raw.githubusercontent.com/swkings/MQTT-Nexus/main/install-online.sh | bash

# 从 develop 分支安装（开发版本）
curl -fsSL https://raw.githubusercontent.com/swkings/MQTT-Nexus/develop/install-online.sh | bash
```

### Windows (PowerShell)

```powershell
# 从 main 分支安装（推荐）
powershell -Command "iwr -UseBasicParsing https://raw.githubusercontent.com/swkings/MQTT-Nexus/main/install-online.bat | iex"

# 从 develop 分支安装（开发版本）
powershell -Command "iwr -UseBasicParsing https://raw.githubusercontent.com/swkings/MQTT-Nexus/develop/install-online.bat | iex"
```

---

## 📋 系统要求

### 必需软件

- ✅ **Node.js**: 18.x 或更高版本
- ✅ **npm**: 9.x 或更高版本
- ✅ **Git**: 用于克隆仓库
- ✅ **curl/wget**: Linux/macOS（二选一）
- ✅ **PowerShell**: Windows（内置）

### 检查已安装的版本

```bash
# 检查 Node.js
node -v

# 检查 npm
npm -v

# 检查 Git
git --version

# 检查 curl（Linux/macOS）
curl --version
```

---

## 🎯 安装过程

在线安装脚本会自动完成以下步骤：

1. **系统检查** - 检测操作系统和必需软件
2. **下载代码** - 从 GitHub 克隆仓库
3. **安装依赖** - 自动安装所有 npm 依赖
4. **配置环境** - 创建 .env.local 配置文件
5. **构建应用** - 编译 TypeScript 和前端资源
6. **完成提示** - 显示安装成功信息和快速启动指南

### 安装输出示例

```
╔════════════════════════════════════════════════════════╗
║         MQTT-Nexus Online Installation                  ║
║         AI-Powered MQTT Desktop Client                  ║
╚════════════════════════════════════════════════════════╝

[INFO] Detected OS: linux (linux-gnu)

[STEP] Checking system requirements...
[SUCCESS] Node.js version: v20.10.0
[SUCCESS] npm version: 10.2.3
[SUCCESS] Git version: git version 2.40.1

[STEP] Downloading MQTT-Nexus from ...
[SUCCESS] Repository downloaded successfully!

[STEP] Installing dependencies...
[SUCCESS] Dependencies installed successfully!

[STEP] Setting up environment...
[SUCCESS] Environment file created: .env.local

[STEP] Building application...
[SUCCESS] Application built successfully!

╔════════════════════════════════════════════════════════╗
║          MQTT-Nexus Installation Complete! 🎉           ║
╚════════════════════════════════════════════════════════╝

Application installed in: /home/user/mqtt-nexus

Quick Start:
  cd mqtt-nexus
  npm run dev              # Start development server
  npm run build            # Build for production
  npm run electron:dev     # Start Electron desktop app
```

---

## 📂 安装位置

应用会安装在当前目录下的 `mqtt-nexus` 文件夹：

```
当前目录/
└── mqtt-nexus/
    ├── node_modules/
    ├── src/
    ├── dist/
    ├── README.md
    └── .env.local
```

---

## 🔧 安装选项

### 选择分支

```bash
# 安装稳定版本（main 分支）
curl -fsSL https://raw.githubusercontent.com/swkings/MQTT-Nexus/main/install-online.sh | bash

# 安装开发版本（develop 分支）
curl -fsSL https://raw.githubusercontent.com/swkings/MQTT-Nexus/develop/install-online.sh | bash

# 安装特定标签版本
# 需要先 clone 仓库，然后 checkout 到特定标签
```

### 自定义安装目录

如果需要自定义安装目录，建议使用手动安装方式：

```bash
# 1. clone 到指定目录
git clone https://github.com/swkings/MQTT-Nexus.git /path/to/your/dir

# 2. 进入目录
cd /path/to/your/dir

# 3. 运行安装脚本
./install.sh
```

---

## 🐛 故障排除

### 权限问题（Linux/macOS）

如果遇到权限错误：

```bash
# 方法 1：添加执行权限
curl -fsSL https://raw.githubusercontent.com/swkings/MQTT-Nexus/main/install-online.sh -o install-online.sh
chmod +x install-online.sh
./install-online.sh

# 方法 2：使用 bash 执行
bash <(curl -fsSL https://raw.githubusercontent.com/swkings/MQTT-Nexus/main/install-online.sh)
```

### Windows PowerShell 执行策略

如果 PowerShell 脚本无法执行：

```powershell
# 临时允许脚本执行
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# 然后运行安装命令
powershell -Command "iwr -UseBasicParsing https://raw.githubusercontent.com/swkings/MQTT-Nexus/main/install-online.bat | iex"
```

### Node.js 版本过低

```bash
# 使用 nvm 升级 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# 然后重新运行安装脚本
```

### 网络问题

如果下载失败：

```bash
# 使用国内镜像
export GIT_SSL_NO_VERIFY=1
curl -fsSL https://raw.githubusercontent.com/swkings/MQTT-Nexus/main/install-online.sh | bash

# 或者手动 clone
git clone https://gitee.com/mirror/MQTT-Nexus.git  # 如果有镜像
cd MQTT-Nexus
./install.sh
```

### 依赖安装失败

```bash
# 清理 npm 缓存
npm cache clean --force

# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com

# 重新运行安装脚本
```

---

## 📊 安装方式对比

| 安装方式 | 优点 | 缺点 | 适用场景 |
|---------|------|------|---------|
| **在线安装** | 一键完成，无需手动操作 | 需要网络连接 | 快速体验、首次安装 |
| **Clone 安装** | 可自定义，支持离线 | 步骤较多 | 开发、定制需求 |
| **手动安装** | 完全控制每个步骤 | 耗时较长 | 学习、调试 |

---

## 🎓 进阶使用

### 自动化部署

可以在 CI/CD 流程中使用在线安装脚本：

```bash
# GitHub Actions 示例
- name: Install MQTT-Nexus
  run: |
    curl -fsSL https://raw.githubusercontent.com/swkings/MQTT-Nexus/main/install-online.sh | bash
```

### 批量部署

```bash
# 在多台机器上批量安装
for host in server1 server2 server3; do
  ssh $host "curl -fsSL https://raw.githubusercontent.com/swkings/MQTT-Nexus/main/install-online.sh | bash"
done
```

---

## 📚 后续步骤

安装完成后，请参考：

- **[README.md](README.md)** - 项目介绍和功能
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - 快速参考卡片
- **[INSTALL.md](INSTALL.md)** - 详细安装指南

---

## 💡 提示

1. **首次安装推荐使用在线安装** - 最简单快捷
2. **开发建议使用 Clone 安装** - 方便修改和调试
3. **生产环境建议手动配置** - 完全控制安装过程
4. **定期检查更新** - 使用 git pull 更新代码

---

<div align="center">

**🚀 5 分钟快速开始你的 MQTT 之旅！**

</div>
