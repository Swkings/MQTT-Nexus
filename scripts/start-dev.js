#!/usr/bin/env node

/**
 * Electron 开发模式启动脚本
 * 支持动态端口配置，从环境变量读取端口
 * 自动检测 Vite 实际使用的端口
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// Windows 下 npm/npx 是可执行批处理（npm.cmd / npx.cmd），直接 spawn 会报 ENOENT
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';
// Windows 下 .cmd 必须经由 cmd.exe 执行，否则 Node 会抛 spawn EINVAL
const useShell = isWindows;

// 从环境变量读取端口，默认为 3000
const devPort = process.env.VITE_APP_DEFAULT_PORT || process.env.PORT || '3000';

console.log(`🚀 启动 Electron 开发模式...`);
console.log(`📌 配置端口：${devPort}`);
console.log('');

let actualPort = null;

// 通过 shell 启动时，kill() 只会杀掉外层 cmd，需要整棵进程树一起结束（否则 Vite 会占着端口）
function killTree(child) {
  if (!child || !child.pid) return;
  if (isWindows) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  child.kill();
}

// 启动 Vite 开发服务器
const viteProcess = spawn(npmCmd, ['run', 'dev'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: useShell,
  env: { ...process.env, NODE_ENV: 'development' }
});

// 去掉 ANSI 颜色码，否则 "Local: http://localhost:3000" 里会夹着转义序列，正则匹配不到
const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;
const stripAnsi = (text) => text.replace(ANSI_PATTERN, '');

// 启动失败时给出明确提示，避免未捕获的 spawn error 直接崩溃
viteProcess.on('error', (error) => {
  console.error(`❌ 无法启动 Vite 开发服务器（${npmCmd}）：${error.message}`);
  process.exit(1);
});

// 读取 Vite 输出，检测实际端口
const rl = createInterface({
  input: viteProcess.stdout,
  terminal: false
});

rl.on('line', (line) => {
  const plainLine = stripAnsi(line);
  console.log(plainLine);

  // 检测 Vite 实际使用的端口
  // 匹配类似 "Local:   http://localhost:3001/" 的输出
  const match = plainLine.match(/localhost:(\d+)/i);
  if (match && !actualPort) {
    actualPort = match[1];
    console.log(``);
    console.log(`✅ 检测到 Vite 实际使用端口：${actualPort}`);
    console.log(`⏳ 等待端口 ${actualPort} 就绪...`);
    
    // 使用 wait-on 等待端口就绪
    const waitOnProcess = spawn(npxCmd, ['wait-on', `http://localhost:${actualPort}`], {
      stdio: 'inherit',
      shell: useShell
    });

    waitOnProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Vite 服务器已就绪，启动 Electron...`);
        console.log(`🔗 Electron 将连接到：http://localhost:${actualPort}`);
        console.log('');
        
        const electronProcess = spawn(npxCmd, ['electron', '.'], {
          stdio: 'inherit',
          shell: useShell,
          env: { 
            ...process.env, 
            NODE_ENV: 'development',
            VITE_APP_DEFAULT_PORT: actualPort
          }
        });

        electronProcess.on('close', () => {
          killTree(viteProcess);
          process.exit();
        });
      } else {
        console.error('❌ 等待 Vite 服务器超时');
        killTree(viteProcess);
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
  killTree(viteProcess);
  process.exit();
});
