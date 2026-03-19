import { contextBridge, ipcRenderer } from 'electron';

console.log('[Preload] Preload script is executing...');
console.log('[Preload] contextBridge available:', !!contextBridge);
console.log('[Preload] ipcRenderer available:', !!ipcRenderer);

// 暴露安全的 API 给渲染进程使用
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  // MQTT IPC 通信 API
  mqtt: {
    connect: (url: string, options: any) => {
      console.log('[Preload] mqtt.connect called:', url);
      return ipcRenderer.invoke('mqtt:connect', url, options);
    },
    subscribe: (topic: string, qos?: number) => {
      console.log('[Preload] mqtt.subscribe called:', topic);
      return ipcRenderer.invoke('mqtt:subscribe', topic, qos);
    },
    unsubscribe: (topic: string) => {
      console.log('[Preload] mqtt.unsubscribe called:', topic);
      return ipcRenderer.invoke('mqtt:unsubscribe', topic);
    },
    publish: (topic: string, message: string, qos?: number) => {
      console.log('[Preload] mqtt.publish called:', topic);
      return ipcRenderer.invoke('mqtt:publish', topic, message, qos);
    },
    disconnect: () => {
      console.log('[Preload] mqtt.disconnect called');
      return ipcRenderer.invoke('mqtt:disconnect');
    },
    onMessage: (callback: (topic: string, message: string, qos: number) => void) => {
      console.log('[Preload] mqtt.onMessage listener registered');
      ipcRenderer.on('mqtt:message', (_, topic, message, qos) => callback(topic, message, qos));
    },
    onConnect: (callback: () => void) => {
      console.log('[Preload] mqtt.onConnect listener registered');
      ipcRenderer.on('mqtt:connected', () => callback());
    },
    onError: (callback: (error: string) => void) => {
      console.log('[Preload] mqtt.onError listener registered');
      ipcRenderer.on('mqtt:error', (_, error) => callback(error));
    },
    onDisconnect: (callback: () => void) => {
      console.log('[Preload] mqtt.onDisconnect listener registered');
      ipcRenderer.on('mqtt:disconnect', () => callback());
    },
    removeAllListeners: () => {
      console.log('[Preload] mqtt.removeAllListeners called');
      ipcRenderer.removeAllListeners('mqtt:message');
      ipcRenderer.removeAllListeners('mqtt:connected');
      ipcRenderer.removeAllListeners('mqtt:error');
      ipcRenderer.removeAllListeners('mqtt:disconnect');
    }
  }
});

console.log('[Preload] electronAPI exposed to window');
console.log('[Preload] Test: window.electronAPI =', (globalThis as any).electronAPI ? 'available' : 'NOT AVAILABLE');
