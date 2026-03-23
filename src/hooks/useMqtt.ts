import { useState, useEffect, useCallback, useRef } from 'react';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';

// 检测是否在 Electron 环境中运行
const isElectron = () => {
  return typeof window !== 'undefined' && 
         navigator && 
         navigator.userAgent && 
         /Electron/i.test(navigator.userAgent);
};

export interface MqttMessage {
  id: string;
  topic: string;
  payload: string;
  qos: number;
  timestamp: number;
  previousPayload?: string;
}

export function useMqtt() {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  
  const [messageLimit, _setMessageLimit] = useState(20);
  const messageLimitRef = useRef(20);
  
  const [selectedTopic, _setSelectedTopic] = useState<string | null>(null);
  const selectedTopicRef = useRef<string | null>(null);

  // 用于存储 IPC 事件处理函数的引用，以便后续移除
  const ipcEventHandlers = useRef<{
    connect?: () => void;
    error?: (error: string) => void;
    disconnect?: () => void;
    message?: (topic: string, message: string, qos: number) => void;
  }>({});

  const setSelectedTopic = useCallback((topic: string | null) => {
    const previousTopic = selectedTopicRef.current;
    _setSelectedTopic(topic);
    selectedTopicRef.current = topic;
    
    // When changing topics, enforce the limit on the previously selected topic
    if (topic !== previousTopic) {
      setMessages(prev => {
        const counts: Record<string, number> = {};
        return prev.filter(m => {
          // Don't filter the newly selected topic
          if (m.topic === topic) return true;
          
          counts[m.topic] = (counts[m.topic] || 0) + 1;
          return counts[m.topic] <= messageLimitRef.current;
        });
      });
    }
  }, []);

  const setMessageLimit = useCallback((limit: number) => {
    _setMessageLimit(limit);
    messageLimitRef.current = limit;
    setMessages(prev => {
      const counts: Record<string, number> = {};
      return prev.filter(m => {
        // Don't filter the currently selected topic
        if (m.topic === selectedTopicRef.current) return true;
        
        counts[m.topic] = (counts[m.topic] || 0) + 1;
        return counts[m.topic] <= limit;
      });
    });
  }, []);

  const connect = useCallback((url: string, options: IClientOptions) => {
    setStatus('connecting');
    setErrorMsg(null);
    
    const inElectron = isElectron();

    // 清理之前的连接 - 增强版清理逻辑
    if (client) {
      try {
        // 移除所有事件监听器，避免触发状态更新
        client.removeAllListeners('connect');
        client.removeAllListeners('error');
        client.removeAllListeners('close');
        client.removeAllListeners('message');
        
        // 只在已连接时才调用 end()
        if (status === 'connected' || status === 'connecting') {
          client.end(true, {}, () => {
            // 回调中使用 setTimeout 确保异步执行
            setTimeout(() => {
              setClient(null);
            }, 0);
          });
        } else {
          setClient(null);
        }
      } catch (err) {
        console.error('[MQTT] Cleanup error:', err);
        setClient(null);
      }
    }

    if (inElectron) {
      // ========== Electron 环境：使用 IPC ==========
      
      // 使用 Electron API 连接
      const connectWithIpc = async () => {
        try {
          // 检查 electronAPI 是否可用
          const electronAPI = (window as any).electronAPI;
          if (!electronAPI || !electronAPI.mqtt) {
            const errorMsg = 'Electron API not available. Please ensure:\n' +
                           '1. Running in Electron (not browser)\n' +
                           '2. preload.js is correctly loaded\n' +
                           '3. webPreferences.preload is set in main.ts';
            console.error('[MQTT]', errorMsg);
            console.error('[MQTT] window.electronAPI:', electronAPI);
            throw new Error(errorMsg);
          }
          
          const result = await electronAPI.mqtt.connect(url, options);
          
          if (result.success) {
            setStatus('connected');
            setErrorMsg(null);
          } else {
            setStatus('error');
            setErrorMsg(result.error || 'Connection failed');
            console.error('[MQTT] Connection failed:', result.error);
          }
        } catch (error: any) {
          console.error('[MQTT] Connection error:', error);
          setStatus('error');
          setErrorMsg(error.message || 'Connection failed');
        }
      };

      connectWithIpc();

      // 设置 IPC 事件监听 - 使用箭头函数保持 this 上下文
      const handleConnect = () => {
        setStatus('connected');
        setErrorMsg(null);
      };

      const handleError = (error: string) => {
        console.error('[MQTT] IPC: Error:', error);
        setStatus('error');
        setErrorMsg(error);
      };

      const handleDisconnect = () => {
        setStatus('disconnected');
        setSubscriptions([]);
        setMessageCounts({});
      };

      const handleMessage = (topic: string, message: string, qos: number) => {
        
        setMessages((prev) => {
          const prevTopicMessages = prev.filter(m => m.topic === topic);
          const previousPayload = prevTopicMessages.length > 0 ? prevTopicMessages[0].payload : undefined;
          
          const newMessage: MqttMessage = {
            id: Math.random().toString(36).substring(2, 9),
            topic,
            payload: message,
            qos,
            timestamp: Date.now(),
            previousPayload,
          };
          
          let currentTopicCount = 0;
          const isSelected = selectedTopicRef.current === topic;
          const limit = isSelected ? Infinity : messageLimitRef.current;
          
          const filteredPrev = prev.filter(m => {
            if (m.topic === topic) {
              currentTopicCount++;
              return currentTopicCount < limit;
            }
            return true;
          });
          
          return [newMessage, ...filteredPrev];
        });

        setMessageCounts((prev) => ({
          ...prev,
          [topic]: (prev[topic] || 0) + 1
        }));
      };

      // 保存事件处理器引用
      ipcEventHandlers.current = {
        connect: handleConnect,
        error: handleError,
        disconnect: handleDisconnect,
        message: handleMessage
      };

      // 绑定事件监听器
      if ((window as any).electronAPI?.mqtt) {
        (window as any).electronAPI.mqtt.onConnect(handleConnect);
        (window as any).electronAPI.mqtt.onError(handleError);
        (window as any).electronAPI.mqtt.onDisconnect(handleDisconnect);
        (window as any).electronAPI.mqtt.onMessage(handleMessage);
      }

    } else {
      // ========== 浏览器环境：使用 WebSocket ==========
      
      const connectOptions: IClientOptions = {
        ...options,
        protocolVersion: 4,
        reconnectPeriod: 0, // 禁用自动重连，由用户手动控制
      };

      const mqttClient = mqtt.connect(url, connectOptions);

      mqttClient.on('connect', () => {
        setStatus('connected');
        setErrorMsg(null);
      });

      mqttClient.on('error', (err) => {
        console.error('[MQTT] Error:', err);
        setStatus('error');
        setErrorMsg(err.message);
        // 不在 error 时立即断开，让 close 事件处理
      });

      mqttClient.on('close', () => {
        // 只有在连接状态不是 disconnected 时才更新状态
        if (status !== 'disconnected') {
          setStatus('disconnected');
        }
      });

      mqttClient.on('message', (topic, message, packet) => {
        const payloadString = message.toString();
        
        setMessages((prev) => {
          const prevTopicMessages = prev.filter(m => m.topic === topic);
          const previousPayload = prevTopicMessages.length > 0 ? prevTopicMessages[0].payload : undefined;
          
          const newMessage: MqttMessage = {
            id: Math.random().toString(36).substring(2, 9),
            topic,
            payload: payloadString,
            qos: packet.qos,
            timestamp: Date.now(),
            previousPayload,
          };
          
          let currentTopicCount = 0;
          const isSelected = selectedTopicRef.current === topic;
          const limit = isSelected ? Infinity : messageLimitRef.current;
          
          const filteredPrev = prev.filter(m => {
            if (m.topic === topic) {
              currentTopicCount++;
              return currentTopicCount < limit;
            }
            return true;
          });
          
          return [newMessage, ...filteredPrev];
        });

        setMessageCounts((prev) => ({
          ...prev,
          [topic]: (prev[topic] || 0) + 1
        }));
      });

      setClient(mqttClient);
    }
  }, [client, status]);

  const disconnect = useCallback(() => {
    const inElectron = isElectron();
    
    if (inElectron) {
      // Electron 环境：通过 IPC 断开
      if ((window as any).electronAPI?.mqtt) {
        try {
          // 先移除所有事件监听器
          (window as any).electronAPI.mqtt.removeAllListeners();
          
          // 然后断开连接
          (window as any).electronAPI.mqtt.disconnect();
        } catch (err) {
          console.error('[MQTT] Electron disconnect error:', err);
        }
      }
      
      // 清理事件处理器引用
      ipcEventHandlers.current = {};
    } else {
      // 浏览器环境：直接断开
      if (client) {
        try {
          // 移除所有事件监听器
          client.removeAllListeners('connect');
          client.removeAllListeners('error');
          client.removeAllListeners('close');
          client.removeAllListeners('message');
          
          // 调用 end 方法，force=true 强制立即关闭
          client.end(true, {}, () => {
            // 回调中清理
            setTimeout(() => {
              setClient(null);
            }, 0);
          });
        } catch (err) {
          console.error('[MQTT] Browser disconnect error:', err);
          setClient(null);
        }
      }
    }
    
    setStatus('disconnected');
    setSubscriptions([]);
    setMessageCounts({});
  }, [client]);

  const subscribe = useCallback((topic: string, qos: 0 | 1 | 2 = 0) => {
    const inElectron = isElectron();
    
    if (inElectron) {
      // Electron 环境：通过 IPC 订阅
      if ((window as any).electronAPI?.mqtt && status === 'connected') {
        (window as any).electronAPI.mqtt.subscribe(topic, qos);
        setSubscriptions((prev) => Array.from(new Set([...prev, topic])));
      } else {
        console.error('[MQTT] Cannot subscribe: not connected or IPC not available');
      }
    } else {
      // 浏览器环境：直接订阅
      if (client && status === 'connected') {
        client.subscribe(topic, { qos }, (err) => {
          if (!err) {
            setSubscriptions((prev) => Array.from(new Set([...prev, topic])));
          } else {
            console.error('[MQTT] Subscribe error:', err);
          }
        });
      } else {
        console.error('[MQTT] Cannot subscribe: client not connected', { 
          hasClient: !!client, 
          status 
        });
      }
    }
  }, [client, status]);

  const unsubscribe = useCallback((topic: string) => {
    const inElectron = isElectron();
    
    if (inElectron) {
      // Electron 环境：通过 IPC 取消订阅
      if ((window as any).electronAPI?.mqtt) {
        (window as any).electronAPI.mqtt.unsubscribe(topic);
        setSubscriptions((prev) => prev.filter((t) => t !== topic));
      }
    } else {
      // 浏览器环境：直接取消订阅
      if (client && status === 'connected') {
        client.unsubscribe(topic, (err) => {
          if (!err) {
            setSubscriptions((prev) => prev.filter((t) => t !== topic));
          }
        });
      }
    }
  }, [client, status]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setMessageCounts({});
  }, []);

  return {
    client,
    status,
    errorMsg,
    messages,
    messageCounts,
    subscriptions,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    clearMessages,
    messageLimit,
    setMessageLimit,
    selectedTopic,
    setSelectedTopic,
  };
}
