export interface ElectronAPI {
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
  updates: {
    check: () => Promise<{
      status: 'available' | 'current' | 'manual' | 'unavailable' | 'error';
      version?: string;
      message?: string;
    }>;
  };
  mqtt: {
    connect: (url: string, options: any) => Promise<any>;
    subscribe: (topic: string, qos?: number) => Promise<any>;
    unsubscribe: (topic: string) => Promise<any>;
    publish: (topic: string, message: string, qos?: number) => Promise<any>;
    disconnect: () => Promise<any>;
    onMessage: (callback: (topic: string, message: string, qos: number) => void) => void;
    onConnect: (callback: () => void) => void;
    onError: (callback: (error: string) => void) => void;
    onDisconnect: (callback: () => void) => void;
    removeAllListeners: () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
