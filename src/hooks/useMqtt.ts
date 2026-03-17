import { useState, useEffect, useCallback, useRef } from 'react';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';

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

  const setSelectedTopic = useCallback((topic: string | null) => {
    _setSelectedTopic(topic);
    selectedTopicRef.current = topic;
    
    // When changing topics, enforce the limit on the previously selected topic
    if (topic !== selectedTopicRef.current) {
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
  
  const lastMessagePerTopic = useRef<Record<string, string>>({});

  const connect = useCallback((url: string, options: IClientOptions) => {
    setStatus('connecting');
    setErrorMsg(null);
    
    setClient((prevClient) => {
      if (prevClient) {
        prevClient.end();
      }
      return null;
    });

    try {
      const mqttClient = mqtt.connect(url, {
        ...options,
        // Browser-specific options for mqtt.js
        protocolVersion: 4,
        reconnectPeriod: 1000,
      });

      mqttClient.on('connect', () => {
        setStatus('connected');
        setErrorMsg(null);
      });

      mqttClient.on('error', (err) => {
        console.error('MQTT Error:', err);
        setStatus('error');
        setErrorMsg(err.message);
        mqttClient.end();
      });

      mqttClient.on('message', (topic, message, packet) => {
        const payloadString = message.toString();
        
        setMessages((prev) => {
          const newMessage: MqttMessage = {
            id: Math.random().toString(36).substring(2, 9),
            topic,
            payload: payloadString,
            qos: packet.qos,
            timestamp: Date.now(),
            previousPayload: lastMessagePerTopic.current[topic],
          };
          
          lastMessagePerTopic.current[topic] = payloadString;
          
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
    } catch (error: any) {
      console.error('Connection failed', error);
      setStatus('error');
      setErrorMsg(error.message || 'Connection failed');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (client) {
      client.end();
      setClient(null);
      setStatus('disconnected');
      setSubscriptions([]);
      setMessageCounts({});
      lastMessagePerTopic.current = {};
    }
  }, [client]);

  const subscribe = useCallback((topic: string, qos: 0 | 1 | 2 = 0) => {
    if (client && status === 'connected') {
      client.subscribe(topic, { qos }, (err) => {
        if (!err) {
          setSubscriptions((prev) => Array.from(new Set([...prev, topic])));
        } else {
          console.error('Subscribe error:', err);
        }
      });
    }
  }, [client, status]);

  const unsubscribe = useCallback((topic: string) => {
    if (client && status === 'connected') {
      client.unsubscribe(topic, (err) => {
        if (!err) {
          setSubscriptions((prev) => prev.filter((t) => t !== topic));
        }
      });
    }
  }, [client, status]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setMessageCounts({});
    lastMessagePerTopic.current = {};
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
