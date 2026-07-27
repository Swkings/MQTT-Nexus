import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import fs from 'fs';

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}

// ES 模块中需要手动获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 开发模式下从 Vite 开发服务器加载，生产模式下加载构建后的文件
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// MQTT 客户端实例
let mqttClient: MqttClient | null = null;

async function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('[Main] Preload path:', preloadPath);
  console.log('[Main] __dirname:', __dirname);
  console.log('[Main] preload.js exists:', fs.existsSync(preloadPath));
  console.log('[Main] Full preload path check:', path.resolve(preloadPath));
  
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    frame: true,
    titleBarStyle: 'hiddenInset', // macOS: 窄边框样式
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
    backgroundColor: '#0f172a',
  });

  Menu.setApplicationMenu(null);

  console.log('[Main] BrowserWindow created with preload:', preloadPath);

  // 设置内容安全策略 (CSP)
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' ws: wss: mqtt: mqtts: http: https:",
          "worker-src 'self' blob:",
        ].join('; ')
      }
    });
  });

  // 始终加载本地构建的 HTML 文件，确保 preload 正常工作
  // 开发模式下需要先运行 npm run build
  win.loadFile(path.join(__dirname, '../dist/index.html'));

  // 加载页面：开发时使用 Vite 本地服务器，生产时加载构建输出
  if (isDev) {
    const devUrl = `http://localhost:${process.env.VITE_APP_DEFAULT_PORT || 3000}`;
    console.log('[Main] Loading from Vite dev server:', devUrl);
    await win.loadURL(devUrl);
  } else {
    await win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 开发环境下自动打开开发者工具
  if (isDev) {
    // win.webContents.openDevTools({ mode: 'detach' });
    
    // 监听页面加载完成事件
    win.webContents.on('did-finish-load', () => {
      console.log('[Main] Page loaded, preload should be executed');
    });
    
    // 监听渲染进程的 console 输出
    win.webContents.on('console-message', (_event, _level, message, _line, _sourceId) => {
      console.log('[Renderer]', message);
    });
  }

  // 添加 F12 快捷键开关开发者工具
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      } else {
        win.webContents.openDevTools();
      }
      event.preventDefault();
    }
  });

  win.on('closed', () => {
    app.quit();
  });
}

// MQTT IPC 事件处理
ipcMain.handle('mqtt:connect', async (event, url: string, options: IClientOptions) => {
  try {
    // 如果已有连接，先断开
    if (mqttClient) {
      mqttClient.end();
      mqttClient = null;
    }

    // 创建新的 MQTT 客户端（使用原生 TCP 或 WebSocket）
    mqttClient = mqtt.connect(url, {
      ...options,
      protocolVersion: 4,
      reconnectPeriod: 1000,
    });

    mqttClient.on('connect', () => {
      event.sender.send('mqtt:connected');
    });

    mqttClient.on('error', (err) => {
      console.error('[Main] MQTT Error:', err);
      event.sender.send('mqtt:error', err.message);
    });

    mqttClient.on('close', () => {
      event.sender.send('mqtt:disconnect');
    });

    mqttClient.on('message', (topic, message, packet) => {
      event.sender.send('mqtt:message', topic, message.toString(), packet.qos);
    });

    return { success: true };
  } catch (error: any) {
    console.error('[Main] MQTT Connect failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mqtt:subscribe', async (_event, topic: string, qos: 0 | 1 | 2 = 0) => {
  if (!mqttClient) {
    return { success: false, error: 'Not connected' };
  }

  return new Promise((resolve) => {
    mqttClient!.subscribe(topic, { qos: qos as 0 | 1 | 2 }, (err) => {
      if (err) {
        console.error('[Main] MQTT Subscribe error:', err);
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('mqtt:unsubscribe', async (_event, topic: string) => {
  if (!mqttClient) {
    return { success: false, error: 'Not connected' };
  }

  return new Promise((resolve) => {
    mqttClient!.unsubscribe(topic, (err) => {
      if (err) {
        console.error('[Main] MQTT Unsubscribe error:', err);
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('mqtt:publish', async (_event, topic: string, message: string, qos: 0 | 1 | 2 = 0) => {
  if (!mqttClient) {
    return { success: false, error: 'Not connected' };
  }

  return new Promise((resolve) => {
    mqttClient!.publish(topic, message, { qos: qos as 0 | 1 | 2 }, (err) => {
      if (err) {
        console.error('[Main] MQTT Publish error:', err);
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('mqtt:disconnect', async () => {
  if (mqttClient) {
    mqttClient.end();
    mqttClient = null;
  }
  return { success: true };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (mqttClient) {
      mqttClient.end();
    }
    app.quit();
  }
});
