#!/bin/bash

echo "🔍 测试 Electron 端口配置"
echo "=========================="
echo ""

# 测试 1: 默认端口
echo "测试 1: 默认端口 (3000)"
echo "----------------------"
grep -n "devPort" electron/main.ts | head -2
echo ""

# 测试 2: Vite 配置
echo "测试 2: Vite 端口配置"
echo "--------------------"
grep -n "port:" vite.config.ts
echo ""

# 测试 3: package.json 脚本
echo "测试 3: package.json 脚本"
echo "------------------------"
grep -A 1 '"dev"' package.json
echo ""

# 测试 4: 环境变量示例
echo "测试 4: .env.example"
echo "-------------------"
if [ -f .env.example ]; then
    cat .env.example | grep PORT
else
    echo "⚠️  .env.example 不存在"
fi
echo ""

# 测试 5: 编译后的文件
echo "测试 5: 编译后的 main.js"
echo "----------------------"
if [ -f dist-electron/main.js ]; then
    grep -n "devPort" dist-electron/main.js | head -2
else
    echo "⚠️  dist-electron/main.js 不存在，请先编译"
fi
echo ""

echo "=========================="
echo "✅ 配置检查完成！"
echo ""
echo "使用方法:"
echo "  默认：npm run electron:dev"
echo "  指定端口：VITE_APP_DEFAULT_PORT=3001 npm run electron:dev"
