/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useMqtt } from './hooks/useMqtt';
import { BrokerSidebar } from './components/BrokerSidebar';
import { BrokerModal } from './components/BrokerModal';
import { TopicTree } from './components/TopicTree';
import { TopicView } from './components/TopicView';
import { PublishPanel } from './components/PublishPanel';
import { MessagesSquare, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Send } from 'lucide-react';
import { BrokerConfig, SavedHost, SavedCredential } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { loadTheme, saveTheme, ThemeConfig, getThemeClasses } from './lib/theme';
import { ThemeProvider } from './contexts/ThemeContext';
import { MQTTClientPrefix } from './etc/config';

export default function App() {
  // Theme states - 移到最前面
  const [theme, setTheme] = useState<ThemeConfig>(() => loadTheme());

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  const themeClasses = useMemo(() => 
    getThemeClasses(theme.mode, theme.overlay), 
    [theme]
  );

  const {
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
  } = useMqtt();

  const [brokers, setBrokers] = useState<BrokerConfig[]>(() => {
    let legacyFavoriteTopics: string[] = [];
    const savedFavoriteTopics = localStorage.getItem('mqtt_favorite_topics');
    if (savedFavoriteTopics) {
      try {
        const parsedFavoriteTopics = JSON.parse(savedFavoriteTopics);
        if (Array.isArray(parsedFavoriteTopics)) {
          legacyFavoriteTopics = parsedFavoriteTopics.filter((topic): topic is string => typeof topic === 'string');
        }
      } catch (e) {
        // Ignore invalid legacy favorite topic data
      }
    }

    const saved = localStorage.getItem('mqtt_brokers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate legacy brokers that only have 'url'
        return parsed.map((b: any) => {
          if (b.url && !b.host) {
            try {
              const u = new URL(b.url);
              return {
                ...b,
                protocol: u.protocol.replace(':', ''),
                host: u.hostname,
                port: parseInt(u.port) || (u.protocol === 'wss:' ? 443 : 80),
                path: u.pathname || '/mqtt',
                subscriptions: b.subscriptions || ['#'],
                favoriteTopics: Array.isArray(b.favoriteTopics) ? b.favoriteTopics : [...legacyFavoriteTopics]
              };
            } catch (e) {
              return {
                ...b,
                protocol: 'ws',
                host: 'localhost',
                port: 8083,
                path: '/mqtt',
                subscriptions: ['#'],
                favoriteTopics: Array.isArray(b.favoriteTopics) ? b.favoriteTopics : [...legacyFavoriteTopics]
              };
            }
          }
          return {
            ...b,
            subscriptions: b.subscriptions || ['#'],
            favoriteTopics: Array.isArray(b.favoriteTopics) ? b.favoriteTopics : [...legacyFavoriteTopics]
          };
        });
      } catch (e) {
        // Fallback if JSON parse fails
      }
    }
    return [{
      id: 'default',
      name: 'EMQX Public',
      protocol: 'ws',
      host: 'broker.emqx.io',
      port: 8083,
      path: '/mqtt',
      clientId: `${MQTTClientPrefix}${Math.random().toString(16).substr(2, 8)}`,
      subscriptions: ['#'],
      favoriteTopics: [...legacyFavoriteTopics]
    }];
  });

  const [savedHosts, setSavedHosts] = useState<SavedHost[]>(() => {
    const saved = localStorage.getItem('mqtt_saved_hosts');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedCredentials, setSavedCredentials] = useState<SavedCredential[]>(() => {
    const saved = localStorage.getItem('mqtt_saved_credentials');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeBrokerId, setActiveBrokerId] = useState<string | null>(null);
  
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isTopicTreeOpen, setIsTopicTreeOpen] = useState(false);  // 默认关闭
  const [shouldAutoExpandTree, setShouldAutoExpandTree] = useState(false);  // 新增：控制自动展开
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBroker, setEditingBroker] = useState<BrokerConfig | null>(null);
  const [activeMainView, setActiveMainView] = useState<'messages' | 'publish'>('messages');
  
  const favoriteTopics = useMemo(
    () => brokers.find(broker => broker.id === activeBrokerId)?.favoriteTopics || [],
    [brokers, activeBrokerId]
  );

  const setFavoriteTopics: React.Dispatch<React.SetStateAction<string[]>> = (value) => {
    if (!activeBrokerId) return;

    setBrokers(prev => prev.map(broker => {
      if (broker.id !== activeBrokerId) return broker;

      const currentFavoriteTopics = broker.favoriteTopics || [];
      const nextFavoriteTopics = typeof value === 'function'
        ? value(currentFavoriteTopics)
        : value;
      return { ...broker, favoriteTopics: nextFavoriteTopics };
    }));
  };

  useEffect(() => {
    localStorage.setItem('mqtt_brokers', JSON.stringify(brokers));
  }, [brokers]);

  useEffect(() => {
    localStorage.setItem('mqtt_saved_hosts', JSON.stringify(savedHosts));
  }, [savedHosts]);

  useEffect(() => {
    localStorage.setItem('mqtt_saved_credentials', JSON.stringify(savedCredentials));
  }, [savedCredentials]);

  const handleAddToFavorites = (topic: string, isWildcard: boolean = false) => {
    // Determine the actual topic path to add
    const topicToAdd = isWildcard ? `${topic}/#` : topic;
    
    if (!favoriteTopics.includes(topicToAdd)) {
      setFavoriteTopics(prev => [...prev, topicToAdd]);
      // Also subscribe immediately
      subscribe(topicToAdd, 2);
    }
  };

  const topics = useMemo(() => Object.keys(messageCounts), [messageCounts]);
  const publishTopics = useMemo(() => Array.from(new Set([
    ...topics,
    ...favoriteTopics,
    ...subscriptions
  ])).filter(topic => topic && !topic.includes('#') && !topic.includes('+')).sort(), [topics, favoriteTopics, subscriptions]);

  // Subscribe to broker's saved subscriptions when connected
  useEffect(() => {
    if (status === 'connected' && activeBrokerId) {
      const activeBroker = brokers.find(b => b.id === activeBrokerId);
      if (activeBroker && activeBroker.subscriptions) {
        activeBroker.subscriptions.forEach(sub => {
          subscribe(sub, 2);
        });
      } else {
        subscribe('#', 2);
      }
      // 连接成功后自动展开 Topic Tree
      setShouldAutoExpandTree(true);
      if (!isTopicTreeOpen) {
        setIsTopicTreeOpen(true);
      }
    }
  }, [status, activeBrokerId]);

  const handleSubscribe = (topic: string, qos: 0 | 1 | 2) => {
    subscribe(topic, qos);
    if (activeBrokerId) {
      setBrokers(prev => prev.map(b => {
        if (b.id === activeBrokerId) {
          const subs = b.subscriptions || [];
          if (!subs.includes(topic)) {
            return { ...b, subscriptions: [...subs, topic] };
          }
        }
        return b;
      }));
    }
  };

  const handleUnsubscribe = (topic: string) => {
    unsubscribe(topic);
    if (activeBrokerId) {
      setBrokers(prev => prev.map(b => {
        if (b.id === activeBrokerId) {
          const subs = b.subscriptions || [];
          return { ...b, subscriptions: subs.filter(t => t !== topic) };
        }
        return b;
      }));
    }
  };

  const handleSaveBroker = (brokerData: BrokerConfig | Omit<BrokerConfig, 'id'>) => {
    if ('id' in brokerData && brokerData.id) {
      // Edit existing
      setBrokers(prev => prev.map(b => b.id === brokerData.id ? { ...b, ...brokerData } as BrokerConfig : b));
      // If editing the active broker, reconnect
      if (activeBrokerId === brokerData.id) {
        disconnect();
        const url = brokerData.url || `${brokerData.protocol}://${brokerData.host}:${brokerData.port}${brokerData.path}`;
        connect(url, {
          clientId: brokerData.clientId,
          username: brokerData.username,
          password: brokerData.password,
          clean: true
        });
      }
    } else {
      // Add new
      const newBroker: BrokerConfig = {
        ...brokerData,
        id: Math.random().toString(36).substr(2, 9),
        favoriteTopics: []
      };
      setBrokers(prev => [...prev, newBroker]);
    }
  };

  const handleDeleteBroker = (id: string) => {
    if (activeBrokerId === id) {
      disconnect();
      setActiveBrokerId(null);
    }
    setBrokers(prev => prev.filter(b => b.id !== id));
  };

  const handleSelectBroker = (broker: BrokerConfig) => {
    const url = broker.url || `${broker.protocol}://${broker.host}:${broker.port}${broker.path}`;
    
    if (activeBrokerId === broker.id) {
      // 点击当前选中的 broker
      if (status === 'connected' || status === 'connecting') {
        // 如果已连接或正在连接，则断开
        disconnect();
      } else {
        // 否则重新连接
        connect(url, {
          clientId: broker.clientId,
          username: broker.username,
          password: broker.password,
          clean: true
        });
      }
    } else {
      // 切换到不同的 broker
      // 先清理消息和主题
      clearMessages();
      setSelectedTopic(null);
      setActiveBrokerId(broker.id);
      
      // 直接连接（disconnect 会在 connect 内部处理）
      connect(url, {
        clientId: broker.clientId,
        username: broker.username,
        password: broker.password,
        clean: true
      });
    }
  };

  const openAddModal = () => {
    setEditingBroker(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (broker: BrokerConfig) => {
    setEditingBroker(broker);
    setIsAddModalOpen(true);
  };

  const handleThemeToggle = () => {
    setTheme(prev => ({
      ...prev,
      mode: prev.mode === 'dark' ? 'light' : 'dark'
    }));
  };

  return (
    <ThemeProvider theme={theme} setTheme={setTheme}>
      <div className={cn(
        "min-h-screen font-sans selection:bg-cyan-500/30 transition-colors duration-300",
        themeClasses.text
      )}
      style={{
        backgroundColor: theme.mode === 'light' ? '#f8fafc' : '#020617'
      }}>
        {/* Background Effects - 透明模式下完全隐藏背景装饰 */}
        <div className={cn(
          "fixed inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-300",
          theme.overlay === 'transparent' ? "opacity-0" : "opacity-100"
        )}>
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px]" />
        </div>

        <div className={cn(
          "relative z-10 flex flex-col h-screen overflow-hidden"
        )}>
          <button
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
            className={cn(
              "fixed left-0 top-1/2 -translate-y-1/2 z-50",
              "p-2 rounded-r-xl rounded-l-none",
              theme.mode === 'light' ? "bg-slate-100 border-slate-300 text-slate-500 hover:text-cyan-600 hover:bg-slate-200" : "bg-slate-800/80 border border-l-0 border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/80",
              "transition-all duration-200 shadow-lg",
              isLeftSidebarOpen ? "opacity-0 hover:opacity-100" : "opacity-100"
            )}
            title={isLeftSidebarOpen ? "Collapse Brokers" : "Expand Brokers"}
          >
            {isLeftSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>

          {/* Topic Tree Collapse Button - 悬浮显示在左侧，Brokers 按钮下方 */}
          <button
            onClick={() => setIsTopicTreeOpen(!isTopicTreeOpen)}
            className={cn(
              "fixed left-0 top-[calc(50%+60px)] -translate-y-1/2 z-50",
              "p-2 rounded-r-xl rounded-l-none",
              theme.mode === 'light' ? "bg-slate-100 border-slate-300 text-slate-500 hover:text-purple-600 hover:bg-slate-200" : "bg-slate-800/80 border border-l-0 border-slate-700/50 text-slate-400 hover:text-purple-400 hover:bg-slate-700/80",
              "transition-all duration-200 shadow-lg",
              isTopicTreeOpen ? "opacity-0 hover:opacity-100" : "opacity-100"
            )}
            title={isTopicTreeOpen ? "Collapse Topic Tree" : "Expand Topic Tree"}
          >
            {isTopicTreeOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </button>

          {/* Main Layout */}
          <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            
            {/* Left Sidebar: Connection & Subs */}
            <AnimatePresence initial={false}>
              {isLeftSidebarOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0, marginRight: 0 }}
                  animate={{ width: 320, opacity: 1, marginRight: 8 }}
                  exit={{ width: 0, opacity: 0, marginRight: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="shrink-0 h-full overflow-hidden flex flex-col gap-4"
                >
                  <div className="w-[320px] h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar pb-2">
                    <div className="flex-1 min-h-[400px]">
                      <BrokerSidebar
                        brokers={brokers}
                        activeBrokerId={activeBrokerId}
                        status={status}
                        errorMsg={errorMsg}
                        subscriptions={subscriptions}
                        onSelect={handleSelectBroker}
                        onAdd={openAddModal}
                        onEdit={openEditModal}
                        onDelete={handleDeleteBroker}
                        onSubscribe={handleSubscribe}
                        onUnsubscribe={handleUnsubscribe}
                        favoriteTopics={favoriteTopics}
                        setFavoriteTopics={setFavoriteTopics}
                        isCollapsed={!isLeftSidebarOpen}
                        onToggleCollapse={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                        onToggleTheme={handleThemeToggle}
                        themeMode={theme.mode}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Middle Sidebar: Topic Tree */}
            <AnimatePresence initial={false}>
              {isTopicTreeOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0, marginRight: 0 }}
                  animate={{ width: 320, opacity: 1, marginRight: 8 }}
                  exit={{ width: 0, opacity: 0, marginRight: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="shrink-0 h-full overflow-hidden flex flex-col"
                >
                  <div className="w-[320px] h-full pb-2">
                    <TopicTree 
                      topics={topics} 
                      messageCounts={messageCounts} 
                      selectedTopic={selectedTopic} 
                      onSelectTopic={setSelectedTopic}
                      onAddToFavorites={handleAddToFavorites}
                      isCollapsed={!isTopicTreeOpen}
                      onToggleCollapse={() => setIsTopicTreeOpen(!isTopicTreeOpen)}
                      autoExpand={shouldAutoExpandTree}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Content: Topic View */}
            <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
              <div className={cn(
                "shrink-0 flex items-center gap-1.5 p-1.5 mb-2 border rounded-xl self-start",
                themeClasses.border,
                themeClasses.panelBg
              )}>
                <button
                  type="button"
                  onClick={() => setActiveMainView('messages')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    activeMainView === 'messages'
                      ? theme.mode === 'light' ? "bg-cyan-100 text-cyan-700" : "bg-cyan-500/20 text-cyan-300"
                      : cn(themeClasses.textSecondary, theme.mode === 'light' ? "hover:bg-slate-200" : "hover:bg-slate-800")
                  )}
                >
                  <MessagesSquare className="w-4 h-4" />
                  Messages
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMainView('publish')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    activeMainView === 'publish'
                      ? theme.mode === 'light' ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-300"
                      : cn(themeClasses.textSecondary, theme.mode === 'light' ? "hover:bg-slate-200" : "hover:bg-slate-800")
                  )}
                >
                  <Send className="w-4 h-4" />
                  Publish
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                {activeMainView === 'messages' ? (
                  <TopicView
                    topic={selectedTopic}
                    messages={messages}
                    onClear={clearMessages}
                  />
                ) : (
                  <PublishPanel
                    status={status}
                    topics={publishTopics}
                    messages={messages}
                    selectedTopic={selectedTopic}
                    onClear={clearMessages}
                    onPublish={publish}
                  />
                )}
              </div>
            </div>
          </main>
        </div>

      <BrokerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveBroker}
        initialData={editingBroker}
        savedHosts={savedHosts}
        onSaveHost={(host) => setSavedHosts(prev => [...prev, host])}
        onDeleteHost={(id) => setSavedHosts(prev => prev.filter(h => h.id !== id))}
        savedCredentials={savedCredentials}
        onSaveCredential={(cred) => setSavedCredentials(prev => [...prev, cred])}
        onDeleteCredential={(id) => setSavedCredentials(prev => prev.filter(c => c.id !== id))}
      />
    </div>
    </ThemeProvider>
  );
}
