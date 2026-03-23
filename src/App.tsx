/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMqtt } from './hooks/useMqtt';
import { BrokerSidebar } from './components/BrokerSidebar';
import { BrokerModal } from './components/BrokerModal';
import { TopicTree } from './components/TopicTree';
import { TopicView } from './components/TopicView';
import { Activity, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Folder, FolderOpen, Sun, Moon, Palette, Layers } from 'lucide-react';
import { BrokerConfig, SavedHost, SavedCredential } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { loadTheme, saveTheme, ThemeConfig, getThemeClasses } from './lib/theme';
import { ThemeProvider } from './contexts/ThemeContext';
import { MQTTClientPrefix } from './etc/config';

export default function App() {
  // Theme states - 移到最前面
  const [theme, setTheme] = useState<ThemeConfig>(() => loadTheme());
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Close theme menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    };

    if (showThemeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showThemeMenu]);

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  const themeClasses = useMemo(() => 
    getThemeClasses(theme.mode, theme.overlay), 
    [theme]
  );

  const handleThemeChange = (mode: 'dark' | 'light') => {
    setTheme(prev => ({ ...prev, mode }));
  };

  const handleOverlayToggle = () => {
    setTheme(prev => ({ 
      ...prev, 
      overlay: prev.overlay === 'opaque' ? 'transparent' : 'opaque' 
    }));
  };

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
    clearMessages,
    messageLimit,
    setMessageLimit,
    selectedTopic,
    setSelectedTopic,
  } = useMqtt();

  const [brokers, setBrokers] = useState<BrokerConfig[]>(() => {
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
                subscriptions: b.subscriptions || ['#']
              };
            } catch (e) {
              return { ...b, protocol: 'ws', host: 'localhost', port: 8083, path: '/mqtt', subscriptions: ['#'] };
            }
          }
          return { ...b, subscriptions: b.subscriptions || ['#'] };
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
      subscriptions: ['#']
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
  const [isTopicTreeOpen, setIsTopicTreeOpen] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBroker, setEditingBroker] = useState<BrokerConfig | null>(null);
  
  // Favorite topics management - lifted to App level
  const [favoriteTopics, setFavoriteTopics] = useState<string[]>(() => {
    const saved = localStorage.getItem('mqtt_favorite_topics');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('mqtt_favorite_topics', JSON.stringify(favoriteTopics));
  }, [favoriteTopics]);

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
      setBrokers(prev => prev.map(b => b.id === brokerData.id ? brokerData as BrokerConfig : b));
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
        id: Math.random().toString(36).substr(2, 9)
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
        "relative z-10 mx-auto p-4 sm:p-6 lg:p-8 min-h-screen lg:h-screen flex flex-col max-w-[1800px] transition-all duration-300"
      )}>
        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between mb-6 lg:mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "relative flex items-center justify-center w-10 h-10 rounded-xl shadow-lg transition-all duration-300",
                themeClasses.logoGradient,
                theme.overlay === 'transparent' ? 'backdrop-blur-xl shadow-cyan-500/10' : 'shadow-cyan-500/20'
              )}>
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={cn("text-2xl font-bold tracking-tight", themeClasses.textPrimary, themeClasses.textShadow)}>MQTT Nexus</h1>
                <p className={cn("text-xs font-mono tracking-wider uppercase", themeClasses.textSecondary, themeClasses.textShadow)}>Real-time Telemetry</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <div className="relative" ref={themeMenuRef}>
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className={cn(
                  "p-2 rounded-xl border transition-colors flex items-center gap-2",
                  themeClasses.cardBg,
                  themeClasses.border,
                  themeClasses.text,
                  theme.mode === 'light' ? "hover:bg-slate-200" : "hover:bg-slate-700/50"
                )}
                title="Theme Settings"
              >
                <Palette className="w-5 h-5" />
                <span className="text-xs font-medium hidden sm:inline">
                  Theme
                </span>
              </button>

              {/* Theme Menu */}
              <AnimatePresence>
                {showThemeMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className={cn(
                      "absolute right-0 mt-2 w-64 rounded-xl border shadow-lg overflow-hidden z-50",
                      themeClasses.cardBg,
                      themeClasses.border,
                      themeClasses.backdropBlur
                    )}
                  >
                    {/* Theme Mode */}
                    <div className={cn("p-3 border-b", themeClasses.border)}>
                      <h4 className={cn("text-sm font-medium mb-2", themeClasses.textPrimary, themeClasses.textShadow)}>Theme Mode</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleThemeChange('dark')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                            theme.mode === 'dark'
                              ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                              : cn(themeClasses.cardBg, themeClasses.border, themeClasses.text, themeClasses.textShadow, "hover:bg-slate-700/50")
                          )}
                        >
                          <Moon className="w-4 h-4" />
                          <span className="text-xs font-medium">Dark</span>
                        </button>
                        <button
                          onClick={() => handleThemeChange('light')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                            theme.mode === 'light'
                              ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                              : cn(themeClasses.cardBg, themeClasses.border, themeClasses.text, themeClasses.textShadow, "hover:bg-slate-700/50")
                          )}
                        >
                          <Sun className="w-4 h-4" />
                          <span className="text-xs font-medium">Light</span>
                        </button>
                      </div>
                    </div>

                    {/* Overlay Toggle */}
                    <div className="p-3">
                      <h4 className={cn("text-sm font-medium mb-2", themeClasses.textPrimary, themeClasses.textShadow)}>Overlay</h4>
                      <button
                        onClick={handleOverlayToggle}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors",
                          theme.overlay === 'transparent'
                            ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                            : cn(themeClasses.cardBg, themeClasses.border, themeClasses.text, themeClasses.textShadow, "hover:bg-slate-700/50")
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4" />
                          <span className={cn("text-xs font-medium", themeClasses.textShadow)}>Transparent Background</span>
                        </div>
                        <div className={cn(
                          "w-8 h-5 rounded-full relative transition-colors",
                          theme.overlay === 'transparent' ? "bg-purple-500" : "bg-slate-600"
                        )}>
                          <div className={cn(
                            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                            theme.overlay === 'transparent' ? "left-3.5" : "left-0.5"
                          )} />
                        </div>
                      </button>
                    </div>

                    {/* Close button */}
                    <div className="p-2 border-t border-slate-700/50">
                      <button
                        onClick={() => setShowThemeMenu(false)}
                        className={cn(
                          "w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          themeClasses.textSecondary,
                          themeClasses.textShadow,
                          "hover:bg-slate-700/50 hover:text-slate-300"
                        )}
                      >
                        Close
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Brokers Collapse Button - 悬浮显示在左侧 */}
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
        <main className="flex-1 flex flex-col lg:flex-row min-h-0 pb-4 lg:pb-0 overflow-hidden">
          
          {/* Left Sidebar: Connection & Subs */}
          <AnimatePresence initial={false}>
            {isLeftSidebarOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0, marginRight: 0 }}
                animate={{ width: 320, opacity: 1, marginRight: 24 }}
                exit={{ width: 0, opacity: 0, marginRight: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="shrink-0 h-full overflow-hidden flex flex-col gap-6"
              >
                <div className="w-[320px] h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-2">
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
                animate={{ width: 320, opacity: 1, marginRight: 24 }}
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
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content: Topic View */}
          <div className="flex-1 flex flex-col h-[600px] lg:h-full min-w-0 pb-2">
            <TopicView 
              topic={selectedTopic} 
              messages={messages} 
              onClear={clearMessages} 
            />
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

