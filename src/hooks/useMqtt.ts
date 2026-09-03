import { startTransition, useState, useEffect, useCallback, useRef } from 'react';
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

const MESSAGE_BATCH_INTERVAL_MS = 100;
const MAX_STORED_MESSAGES = 5000;

function limitStoredMessages(messages: MqttMessage[], perTopicLimit: number): MqttMessage[] {
  const topicCounts = new Map<string, number>();
  const limitedMessages: MqttMessage[] = [];
  const normalizedLimit = Math.max(1, perTopicLimit);

  for (const message of messages) {
    const count = topicCounts.get(message.topic) || 0;
    if (count >= normalizedLimit) continue;

    topicCounts.set(message.topic, count + 1);
    limitedMessages.push(message);
    if (limitedMessages.length >= MAX_STORED_MESSAGES) break;
  }

  return limitedMessages;
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
  const pendingMessagesRef = useRef<MqttMessage[]>([]);
  const messageFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageSequenceRef = useRef(0);
  const messageGenerationRef = useRef(0);

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
    
    if (topic !== previousTopic) {
      setMessages(prev => limitStoredMessages(prev, messageLimitRef.current));
    }
  }, []);

  const setMessageLimit = useCallback((limit: number) => {
    _setMessageLimit(limit);
    messageLimitRef.current = limit;
    setMessages(prev => limitStoredMessages(prev, limit));
  }, []);

  const flushPendingMessages = useCallback(() => {
    const pendingMessages = pendingMessagesRef.current;
    pendingMessagesRef.current = [];
    messageFlushTimerRef.current = null;
    if (pendingMessages.length === 0) return;
    const messageGeneration = messageGenerationRef.current;

    startTransition(() => {
      setMessages(prev => {
        if (messageGeneration !== messageGenerationRef.current) return prev;

        const latestPayloadByTopic = new Map<string, string>();
        for (const message of prev) {
          if (!latestPayloadByTopic.has(message.topic)) {
            latestPayloadByTopic.set(message.topic, message.payload);
          }
        }

        const completedMessages = pendingMessages.map(message => {
          const completedMessage = {
            ...message,
            previousPayload: latestPayloadByTopic.get(message.topic)
          };
          latestPayloadByTopic.set(message.topic, message.payload);
          return completedMessage;
        });

        return limitStoredMessages(
          [...completedMessages.reverse(), ...prev],
          messageLimitRef.current
        );
      });

      setMessageCounts(prev => {
        if (messageGeneration !== messageGenerationRef.current) return prev;

        const next = { ...prev };
        for (const message of pendingMessages) {
          next[message.topic] = (next[message.topic] || 0) + 1;
        }
        return next;
      });
    });
  }, []);

  const enqueueMessage = useCallback((topic: string, payload: string, qos: number) => {
    messageSequenceRef.current += 1;
    pendingMessagesRef.current.push({
      id: `${Date.now()}-${messageSequenceRef.current}`,
      topic,
      payload,
      qos,
      timestamp: Date.now()
    });

    if (messageFlushTimerRef.current === null) {
      messageFlushTimerRef.current = setTimeout(flushPendingMessages, MESSAGE_BATCH_INTERVAL_MS);
    }
  }, [flushPendingMessages]);

  const clearPendingMessages = useCallback(() => {
    messageGenerationRef.current += 1;
    if (messageFlushTimerRef.current !== null) {
      clearTimeout(messageFlushTimerRef.current);
      messageFlushTimerRef.current = null;
    }
    pendingMessagesRef.current = [];
  }, []);

  useEffect(() => clearPendingMessages, [clearPendingMessages]);

  const connect = useCallback((url: string, options: IClientOptions) => {
    clearPendingMessages();
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
        clearPendingMessages();
        setStatus('disconnected');
        setSubscriptions([]);
        setMessageCounts({});
      };

      const handleMessage = (topic: string, message: string, qos: number) => {
        enqueueMessage(topic, message, qos);
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
        enqueueMessage(topic, message.toString(), packet.qos);
      });

      setClient(mqttClient);
    }
  }, [client, status, clearPendingMessages, enqueueMessage]);

  const disconnect = useCallback(() => {
    clearPendingMessages();
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
  }, [client, clearPendingMessages]);

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

  const publish = useCallback(async (topic: string, message: string, qos: 0 | 1 | 2 = 0) => {
    const trimmedTopic = topic.trim();
    if (status !== 'connected') {
      throw new Error('Connect to a broker before publishing');
    }
    if (!trimmedTopic) {
      throw new Error('Topic is required');
    }
    if (trimmedTopic.includes('#') || trimmedTopic.includes('+')) {
      throw new Error('Publish topics cannot contain wildcard characters');
    }

    if (isElectron()) {
      const mqttApi = (window as any).electronAPI?.mqtt;
      if (!mqttApi) {
        throw new Error('Electron MQTT API is not available');
      }

      const result = await mqttApi.publish(trimmedTopic, message, qos);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to publish message');
      }
      return;
    }

    if (!client) {
      throw new Error('MQTT client is not connected');
    }

    await new Promise<void>((resolve, reject) => {
      client.publish(trimmedTopic, message, { qos }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }, [client, status]);

  const clearMessages = useCallback(() => {
    clearPendingMessages();
    setMessages([]);
    setMessageCounts({});
  }, [clearPendingMessages]);

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
    publish,
    clearMessages,
    messageLimit,
    setMessageLimit,
    selectedTopic,
    setSelectedTopic,
  };
}
