import { app, BrowserWindow, dialog, ipcMain, Menu, shell, type WebContents } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import fs from 'fs';
import { inspect } from 'node:util';
import electronUpdater from 'electron-updater';

const { autoUpdater } = electronUpdater;
const releasesUrl = 'https://github.com/Swkings/MQTT-Nexus/releases/latest';
const latestReleaseApiUrl = 'https://api.github.com/repos/Swkings/MQTT-Nexus/releases/latest';

const originalConsoleError = console.error.bind(console);

function appendMainLog(level: string, values: unknown[]) {
  const message = values.map((value) => {
    if (value instanceof Error) {
      return value.stack ?? `${value.name}: ${value.message}`;
    }
    return typeof value === 'string' ? value : inspect(value, { depth: 5 });
  }).join(' ');

  try {
    const logDirectory = path.join(app.getPath('home'), '.mqtt-nexus');
    fs.mkdirSync(logDirectory, { recursive: true });
    fs.appendFileSync(
      path.join(logDirectory, 'main.log'),
      `${new Date().toISOString()} [${level}] ${message}\n`,
      'utf8',
    );
  } catch (error) {
    originalConsoleError('[Main] Unable to write log file:', error);
  }
}

console.error = (...args: Parameters<typeof console.error>) => {
  originalConsoleError(...args);
  appendMainLog('ERROR', args);
};

process.on('uncaughtException', (error, origin) => {
  appendMainLog('FATAL', [origin, error]);
  app.quit();
});

process.on('unhandledRejection', (reason) => {
  appendMainLog('ERROR', ['Unhandled promise rejection:', reason]);
});

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

function sendToRenderer(sender: WebContents, channel: string, ...args: unknown[]) {
  if (!sender.isDestroyed()) {
    sender.send(channel, ...args);
  }
}

function stopMqttClient() {
  const client = mqttClient;
  mqttClient = null;
  client?.end(true);
}

type UpdateCheckResponse = {
  status: 'available' | 'current' | 'manual' | 'unavailable' | 'error';
  version?: string;
  message?: string;
};

function compareVersions(leftVersion: string, rightVersion: string): number {
  const parseVersion = (version: string) => {
    const parts = version.replace(/^v/i, '').split(/[+-]/, 1)[0].split('.');
    if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part))) {
      throw new Error(`Invalid release version: ${version}`);
    }
    return parts.map(Number);
  };

  const left = parseVersion(leftVersion);
  const right = parseVersion(rightVersion);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] > right[index] ? 1 : -1;
    }
  }
  return 0;
}

async function checkLatestGithubRelease(): Promise<UpdateCheckResponse> {
  const response = await fetch(latestReleaseApiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'MQTT-Nexus',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`GitHub returned HTTP ${response.status} while checking for updates.`);
  }

  const release = await response.json() as { tag_name?: unknown };
  if (typeof release.tag_name !== 'string') {
    throw new Error('GitHub latest release did not include a version tag.');
  }

  const latestVersion = release.tag_name.replace(/^v/i, '');
  const currentVersion = app.getVersion();
  return compareVersions(latestVersion, currentVersion) > 0
    ? { status: 'manual', version: latestVersion }
    : { status: 'current', version: currentVersion };
}

let updateCheckPromise: Promise<UpdateCheckResponse> | null = null;

function checkForUpdates(): Promise<UpdateCheckResponse> {
  if (updateCheckPromise) {
    return updateCheckPromise;
  }

  const checkPromise = (async (): Promise<UpdateCheckResponse> => {
    if (!app.isPackaged) {
      return { status: 'unavailable', message: 'Update checks are available in packaged desktop builds.' };
    }

    if (process.platform === 'linux' && !process.env.APPIMAGE) {
      try {
        return await checkLatestGithubRelease();
      } catch (error) {
        console.error('[Updater] Could not check the latest GitHub release:', error);
        return {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }

    try {
      const result = await autoUpdater.checkForUpdates();
      if (result?.isUpdateAvailable) {
        return { status: 'available', version: result.updateInfo.version };
      }
      return { status: 'current', version: app.getVersion() };
    } catch (error) {
      console.error('[Updater] Could not check for updates:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  })().finally(() => {
    updateCheckPromise = null;
  });

  updateCheckPromise = checkPromise;
  return checkPromise;
}

function configureAutoUpdates() {
  if (!app.isPackaged) {
    return;
  }

  if (process.platform === 'linux' && !process.env.APPIMAGE) {
    console.info('[Updater] Linux automatic updates require the AppImage package.');
    return;
  }

  autoUpdater.on('error', (error) => {
    console.error('[Updater] Update check or installation failed:', error);
  });

  autoUpdater.on('update-available', (info) => {
    console.info(`[Updater] Version ${info.version} is available.`);
  });

  autoUpdater.on('update-not-available', () => {
    console.info('[Updater] The app is up to date.');
  });

  autoUpdater.on('update-downloaded', async (info) => {
    try {
      const { response } = await dialog.showMessageBox({
        type: 'info',
        title: 'Update ready',
        message: `MQTT Nexus ${info.version} has been downloaded.`,
        detail: 'Restart the app to install the update.',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      });

      if (response === 0) {
        stopMqttClient();
        autoUpdater.quitAndInstall();
      }
    } catch (error) {
      console.error('[Updater] Could not prompt to install the update:', error);
    }
  });

  void checkForUpdates();
}

ipcMain.handle('app:check-for-updates', async () => {
  const result = await checkForUpdates();
  if (result.status === 'manual') {
    try {
      await shell.openExternal(releasesUrl);
      return { ...result, message: `Version ${result.version} is available. The download page has been opened for manual installation.` };
    } catch (error) {
      console.error('[Updater] Could not open the download page:', error);
      return { status: 'error', message: 'Could not open the GitHub Releases download page.' };
    }
  }
  return result;
});

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
    
  }

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (isDev) {
      console.log('[Renderer]', message);
    }
    if (level === 3) {
      appendMainLog('ERROR', [`[Renderer] ${message}`, `${sourceId}:${line}`]);
    }
  });

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
      sendToRenderer(event.sender, 'mqtt:connected');
    });

    mqttClient.on('error', (err) => {
      console.error('[Main] MQTT Error:', err);
      sendToRenderer(event.sender, 'mqtt:error', err.message);
    });

    mqttClient.on('close', () => {
      sendToRenderer(event.sender, 'mqtt:disconnect');
    });

    mqttClient.on('message', (topic, message, packet) => {
      sendToRenderer(event.sender, 'mqtt:message', topic, message.toString(), packet.qos);
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
  const client = mqttClient;
  if (!client?.connected) {
    return { success: false, error: 'Not connected' };
  }

  return new Promise((resolve) => {
    client.publish(topic, message, { qos: qos as 0 | 1 | 2 }, (err) => {
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
  configureAutoUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', stopMqttClient);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopMqttClient();
    app.quit();
  }
});
