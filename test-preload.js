#!/usr/bin/env node

/**
 * 测试 Electron preload 加载
 */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing Electron preload...\n');
console.log('__dirname:', __dirname);
console.log('preload.js path:', path.join(__dirname, 'dist-electron', 'preload.js'));

let win;

app.whenReady().then(() => {
  console.log('\nCreating BrowserWindow...\n');
  
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'dist-electron', 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  console.log('BrowserWindow created');
  console.log('webPreferences:', win.webContents.getWebPreferences());
  console.log('');
  
  // 加载一个简单的测试页面
  win.loadURL('data:text/html,<h1>Preload Test</h1><script>console.log("electronAPI:", window.electronAPI);</script>');
  
  // 监听控制台输出
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('[Renderer Console]', message);
    
    if (message.includes('electronAPI')) {
      console.log('\n✅ Preload test complete!');
      setTimeout(() => {
        app.quit();
      }, 1000);
    }
  });
  
  // 监听 IPC 消息
  win.webContents.on('did-finish-load', () => {
    console.log('Page loaded');
    
    // 直接执行测试
    win.webContents.executeJavaScript(`
      (function() {
        console.log('window.electronAPI:', window.electronAPI);
        console.log('typeof electronAPI:', typeof window.electronAPI);
        if (window.electronAPI && window.electronAPI.mqtt) {
          console.log('✅ MQTT API available');
          return true;
        } else {
          console.log('❌ MQTT API NOT available');
          return false;
        }
      })()
    `).then(result => {
      console.log('Test result:', result);
    }).catch(err => {
      console.error('Test error:', err);
    });
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
