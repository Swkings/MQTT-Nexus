#!/bin/bash

# MQTT Nexus Electron 测试脚本
# 用于快速验证 Electron 环境配置是否正确

set -e

echo "🔍 MQTT Nexus Electron 环境测试"
echo "================================"
echo ""

# 检查 Node.js 版本
echo "📦 检查 Node.js 版本..."
NODE_VERSION=$(node --version)
echo "   Node.js: $NODE_VERSION"

# 检查必要依赖
echo ""
echo "📦 检查必要依赖..."

check_package() {
    if npm list "$1" > /dev/null 2>&1; then
        echo "   ✅ $1 已安装"
    else
        echo "   ❌ $1 未安装"
        return 1
    fi
}

check_package "electron"
check_package "vite"
check_package "react"
check_package "mqtt"

# 检查文件结构
echo ""
echo "📁 检查文件结构..."

check_file() {
    if [ -f "$1" ]; then
        echo "   ✅ $1 存在"
    else
        echo "   ❌ $1 不存在"
        return 1
    fi
}

check_file "electron/main.ts"
check_file "electron/preload.ts"
check_file "electron/tsconfig.json"
check_file "vite.config.ts"
check_file "electron-builder.json"

# TypeScript 编译检查
echo ""
echo "🔧 TypeScript 编译检查..."

if npx tsc --noEmit > /dev/null 2>&1; then
    echo "   ✅ 主项目 TypeScript 编译通过"
else
    echo "   ❌ 主项目 TypeScript 编译失败"
    exit 1
fi

if npx tsc -p electron/tsconfig.json --noEmit > /dev/null 2>&1; then
    echo "   ✅ Electron TypeScript 编译通过"
else
    echo "   ❌ Electron TypeScript 编译失败"
    exit 1
fi

# 总结
echo ""
echo "================================"
echo "✅ 所有检查通过！"
echo ""
echo "🚀 启动开发环境:"
echo "   npm run electron:dev"
echo ""
echo "📦 构建应用:"
echo "   npm run electron:build"
echo ""
