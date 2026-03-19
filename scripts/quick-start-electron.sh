#!/bin/bash

echo "🚀 Quick Start Electron"
echo "======================"
echo ""

# 1. 停止所有 Electron 进程
echo "📴 Stopping Electron processes..."
pkill -f electron
sleep 1

# 2. 清理编译产物
echo "🧹 Cleaning dist-electron..."
rm -rf dist-electron

# 3. 编译 Electron
echo "🔨 Compiling Electron..."
npx tsc -p electron/tsconfig.json
if [ $? -ne 0 ]; then
  echo "❌ Electron compilation failed!"
  exit 1
fi
echo "✅ Electron compiled successfully"
echo ""

# 4. 构建前端
echo "🏗️ Building frontend..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed!"
  exit 1
fi
echo "✅ Frontend built successfully"
echo ""

# 5. 启动 Electron
echo "🎯 Starting Electron..."
npx electron .
