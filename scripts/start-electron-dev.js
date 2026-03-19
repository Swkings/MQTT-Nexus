#!/usr/bin/env node

/**
 * Electron 开发模式启动脚本
 * 支持动态端口配置，从环境变量读取端口
 * 自动检测 Vite 实际使用的端口
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// 从环境变量读取端口，默认为 3000
const devPort = process.env.VITE_APP_DEFAULT_PORT || process.env.PORT || '3000';

console.log(`🚀 启动 Electron 开发模式...`);
console.log(`📌 配置端口：${devPort}`);
console.log('');

let actualPort = null;

// 启动 Vite 开发服务器
const viteProcess = spawn('npm', ['run', 'dev'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development' }
});

// 读取 Vite 输出，检测实际端口
const rl = createInterface({
  input: viteProcess.stdout,
  terminal: false
});

rl.on('line', (line) => {
  console.log(line);
  
  // 检测 Vite 实际使用的端口
  // 匹配类似 "Local:   http://localhost:3001/" 的输出
  const match = line.match(/Local:\s+https?:\/\/localhost:(\d+)/i);
  if (match && !actualPort) {
    actualPort = match[1];
    console.log(``);
    console.log(`✅ 检测到 Vite 实际使用端口：${actualPort}`);
    console.log(`⏳ 等待端口 ${actualPort} 就绪...`);
    
    // 使用 wait-on 等待端口就绪
    const waitOnProcess = spawn('npx', ['wait-on', `http://localhost:${actualPort}`], {
      stdio: 'inherit'
    });

    waitOnProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Vite 服务器已就绪，启动 Electron...`);
        console.log(`🔗 Electron 将连接到：http://localhost:${actualPort}`);
        console.log('');
        
        const electronProcess = spawn('npx', ['electron', '.'], {
          stdio: 'inherit',
          env: { 
            ...process.env, 
            NODE_ENV: 'development',
            VITE_APP_DEFAULT_PORT: actualPort
          }
        });

        electronProcess.on('close', () => {
          viteProcess.kill();
          process.exit();
        });
      } else {
        console.error('❌ 等待 Vite 服务器超时');
        viteProcess.kill();
        process.exit(1);
      }
    });
  }
});

// 同时输出 stderr
viteProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

viteProcess.on('close', (code) => {
  rl.close();
  process.exit(code);
});

// 处理进程退出
process.on('SIGINT', () => {
  viteProcess.kill();
  process.exit();
});
