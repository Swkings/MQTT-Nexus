#!/usr/bin/env node

/**
 * Electron API 诊断脚本
 * 用于检查 Electron 配置是否正确
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Electron API 诊断工具\n');

// 检查必要的文件
const files = [
  'electron/main.ts',
  'electron/preload.ts',
  'dist-electron/main.js',
  'dist-electron/preload.js',
  'src/types/electron.d.ts'
];

console.log('📁 检查文件存在性:');
files.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// 检查编译后的 preload.js 内容
console.log('\n📝 检查 preload.js 内容:');
const preloadPath = path.join(__dirname, '..', 'dist-electron', 'preload.js');

if (fs.existsSync(preloadPath)) {
  const content = fs.readFileSync(preloadPath, 'utf-8');
  const hasContextBridge = content.includes('contextBridge');
  const hasElectronAPI = content.includes('electronAPI');
  const hasMqtt = content.includes('mqtt');
  
  console.log(`  ${hasContextBridge ? '✅' : '❌'} contextBridge 使用`);
  console.log(`  ${hasElectronAPI ? '✅' : '❌'} electronAPI 暴露`);
  console.log(`  ${hasMqtt ? '✅' : '❌'} mqtt API 定义`);
  
  if (hasMqtt) {
    console.log('\n✅ preload.js 包含 MQTT API');
  }
} else {
  console.log('  ❌ preload.js 不存在');
}

// 检查 main.ts 中的 preload 配置
console.log('\n🔧 检查 main.ts 配置:');
const mainPath = path.join(__dirname, '..', 'electron', 'main.ts');

if (fs.existsSync(mainPath)) {
  const mainContent = fs.readFileSync(mainPath, 'utf-8');
  const hasPreload = mainContent.includes('preload:');
  const hasNodeIntegration = mainContent.includes('nodeIntegration');
  const hasContextIsolation = mainContent.includes('contextIsolation');
  
  console.log(`  ${hasPreload ? '✅' : '❌'} preload 配置`);
  console.log(`  ${hasNodeIntegration ? '✅' : '❌'} nodeIntegration 配置`);
  console.log(`  ${hasContextIsolation ? '✅' : '❌'} contextIsolation 配置`);
  
  // 提取 preload 路径
  const preloadMatch = mainContent.match(/preload:\s*path\.join\([^)]+\)/);
  if (preloadMatch) {
    console.log(`  📍 Preload 路径：${preloadMatch[0]}`);
  }
}

console.log('\n✅ 诊断完成！\n');

console.log('📋 下一步:');
console.log('1. 启动 Electron: npm run electron:dev');
console.log('2. 按 F12 打开开发者工具');
console.log('3. 在控制台中执行:');
console.log('   console.log("electronAPI:", window.electronAPI);');
console.log('   console.log("mqtt API:", window.electronAPI.mqtt);');
console.log('\n如果 window.electronAPI 是 undefined，说明 preload 没有正确加载');
