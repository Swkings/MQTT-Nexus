# 🪟 Windows 安装指南

## ⚡ 快速安装（推荐）

### PowerShell 方式（推荐）

**PowerShell 5.1+ 或 PowerShell 7+:**

```powershell
# 一键安装
powershell -Command "iwr -UseBasicParsing https://raw.githubusercontent.com/Swkings/MQTT-Nexus/develop/install-online.ps1 | iex"
```

**或者下载后运行：**

```powershell
# 1. 下载脚本
iwr -UseBasicParsing https://raw.githubusercontent.com/Swkings/MQTT-Nexus/develop/install-online.ps1 -OutFile install-online.ps1

# 2. 运行脚本
.\install-online.ps1
```

### CMD 方式

**命令提示符 (CMD):**

```batch
# 一键安装
install-online.bat
```

**注意**: 
- ✅ `.ps1` 文件用于 **PowerShell**
- ✅ `.bat` 文件用于 **CMD**
- ❌ 不要在 PowerShell 中直接运行 `.bat` 文件内容

---

## 📋 系统要求

### 必需软件

- ✅ **Node.js**: 18.x 或更高版本
- ✅ **npm**: 9.x 或更高版本
- ✅ **Git**: 用于克隆仓库

### 检查已安装的版本

```powershell
# 检查 Node.js
node -v

# 检查 npm
npm -v

# 检查 Git
git --version
```

---

## 🔧 常见问题解决

### 问题 1: PowerShell 脚本执行策略

**错误信息**: 
```
cannot be loaded because running scripts is disabled on this system
```

**解决方案**:

```powershell
# 方法 1：临时允许当前进程执行脚本
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# 然后运行安装脚本
.\install-online.ps1

# 方法 2：直接绕过策略限制
powershell -ExecutionPolicy Bypass -File install-online.ps1

# 方法 3：使用 Invoke-Expression
iwr -UseBasicParsing https://raw.githubusercontent.com/Swkings/MQTT-Nexus/main/install-online.ps1 | iex
```

### 问题 2: iwr 或 iex 命令不存在

**原因**: 使用了旧版本 PowerShell

**解决方案**:

```powershell
# 使用完整命令
Invoke-WebRequest -UseBasicParsing https://raw.githubusercontent.com/Swkings/MQTT-Nexus/main/install-online.ps1 | Invoke-Expression

# 或者下载安装 PowerShell 7
# https://github.com/PowerShell/PowerShell/releases
```

### 问题 3: Git 未安装

**错误信息**: 
```
Git is not installed. Please install Git first.
```

**解决方案**:

1. 下载 Git: https://git-scm.com/download/win
2. 安装 Git（使用默认选项）
3. 重启 PowerShell
4. 验证安装：`git --version`

### 问题 4: Node.js 版本过低

**错误信息**: 
```
Node.js version must be 18.x or higher
```

**解决方案**:

1. 访问 https://nodejs.org/
2. 下载并安装 LTS 版本（推荐）
3. 重启 PowerShell
4. 验证安装：`node -v`

### 问题 5: 权限不足

**错误信息**: 
```
Access to the path is denied
```

**解决方案**:

```powershell
# 以管理员身份运行 PowerShell
# 右键点击 PowerShell → 以管理员身份运行

# 然后运行安装脚本
.\install-online.ps1
```

---

## 📊 安装方式对比

| 方式 | 命令 | 适用场景 |
|------|------|---------|
| **PowerShell (推荐)** | `iwr ... \| iex` | 现代 Windows，一键安装 |
| **CMD** | `install-online.bat` | 旧版 Windows，传统方式 |
| **手动安装** | 多步骤 | 学习、调试、定制 |

---

## 🎓 手动安装步骤

如果自动安装脚本无法运行，可以手动安装：

### 步骤 1: 安装 Node.js

1. 访问 https://nodejs.org/
2. 下载并安装 LTS 版本
3. 验证：`node -v`

### 步骤 2: 安装 Git

1. 访问 https://git-scm.com/download/win
2. 下载并安装
3. 验证：`git --version`

### 步骤 3: 克隆仓库

```powershell
git clone https://github.com/Swkings/MQTT-Nexus.git
cd MQTT-Nexus
```

### 步骤 4: 安装依赖

```powershell
npm ci
```

### 步骤 5: 配置环境

```powershell
Copy-Item .env.example .env.local
```

### 步骤 6: 构建应用

```powershell
npm run build
```

---

## 🚀 快速启动

安装完成后：

```powershell
# 进入安装目录
cd mqtt-nexus

# 启动开发服务器
npm run dev

# 或启动 Electron 桌面应用
npm run electron:dev
```

浏览器访问：http://localhost:3000

---

## 📚 相关文档

- **[README.md](README.md)** - 项目介绍
- **[INSTALL.md](INSTALL.md)** - 详细安装指南
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - 快速参考

---

## 💡 提示

1. **推荐使用 PowerShell 7**: 更好的兼容性和性能
   - 下载：https://github.com/PowerShell/PowerShell/releases
   
2. **如果自动安装失败**: 使用手动安装方式
   
3. **网络问题**: 可能需要配置代理或使用镜像

4. **防火墙**: 确保允许 PowerShell 和 Git 访问网络

---

<div align="center">

**🚀 5 分钟快速开始你的 MQTT 之旅！**

</div>
