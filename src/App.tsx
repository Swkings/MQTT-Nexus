/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useMqtt } from './hooks/useMqtt';
import { BrokerSidebar } from './components/BrokerSidebar';
import { AddBrokerModal } from './components/AddBrokerModal';
import { SubscriptionPanel } from './components/SubscriptionPanel';
import { TopicTree } from './components/TopicTree';
import { TopicView } from './components/TopicView';
import { Activity, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Folder, FolderOpen } from 'lucide-react';
import { BrokerConfig } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const {
    status,
    errorMsg,
    messages,
    subscriptions,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    clearMessages,
  } = useMqtt();

  const [brokers, setBrokers] = useState<BrokerConfig[]>(() => {
    const saved = localStorage.getItem('mqtt_brokers');
    return saved ? JSON.parse(saved) : [{
      id: 'default',
      name: 'EMQX Public',
      url: 'ws://broker.emqx.io:8083/mqtt',
      clientId: `mqttjs_${Math.random().toString(16).substr(2, 8)}`
    }];
  });

  const [activeBrokerId, setActiveBrokerId] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isTopicTreeOpen, setIsTopicTreeOpen] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('mqtt_brokers', JSON.stringify(brokers));
  }, [brokers]);

  const { topics, messageCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    messages.forEach(m => {
      counts[m.topic] = (counts[m.topic] || 0) + 1;
    });
    return {
      topics: Object.keys(counts),
      messageCounts: counts
    };
  }, [messages]);

  const handleAddBroker = (brokerData: Omit<BrokerConfig, 'id'>) => {
    const newBroker: BrokerConfig = {
      ...brokerData,
      id: Math.random().toString(36).substr(2, 9)
    };
    setBrokers(prev => [...prev, newBroker]);
  };

  const handleDeleteBroker = (id: string) => {
    if (activeBrokerId === id) {
      disconnect();
      setActiveBrokerId(null);
    }
    setBrokers(prev => prev.filter(b => b.id !== id));
  };

  const handleSelectBroker = (broker: BrokerConfig) => {
    if (activeBrokerId === broker.id) {
      if (status === 'connected' || status === 'connecting') {
        disconnect();
      } else {
        connect(broker.url, {
          clientId: broker.clientId,
          username: broker.username,
          password: broker.password,
          clean: true
        });
      }
    } else {
      disconnect();
      clearMessages();
      setSelectedTopic(null);
      setActiveBrokerId(broker.id);
      connect(broker.url, {
        clientId: broker.clientId,
        username: broker.username,
        password: broker.password,
        clean: true
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-cyan-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto p-4 sm:p-6 lg:p-8 min-h-screen lg:h-screen flex flex-col max-w-[1800px]">
        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between mb-6 lg:mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
              className="p-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-400 hover:text-cyan-400 transition-colors"
              title={isLeftSidebarOpen ? "Collapse Brokers" : "Expand Brokers"}
            >
              {isLeftSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 shadow-lg shadow-cyan-500/20">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight">MQTT Nexus</h1>
                <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">Real-time Telemetry</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsTopicTreeOpen(!isTopicTreeOpen)}
              className="p-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-2"
              title={isTopicTreeOpen ? "Collapse Topic Tree" : "Expand Topic Tree"}
            >
              <span className="text-xs font-medium hidden sm:inline">Topic Tree</span>
              {isTopicTreeOpen ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
            </button>
          </div>
        </header>

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
                  <div className="shrink-0 h-[300px]">
                    <BrokerSidebar
                      brokers={brokers}
                      activeBrokerId={activeBrokerId}
                      status={status}
                      errorMsg={errorMsg}
                      onSelect={handleSelectBroker}
                      onAdd={() => setIsAddModalOpen(true)}
                      onDelete={handleDeleteBroker}
                    />
                  </div>
                  
                  <div className="flex-1 min-h-[300px]">
                    <SubscriptionPanel
                      status={status}
                      subscriptions={subscriptions}
                      onSubscribe={subscribe}
                      onUnsubscribe={unsubscribe}
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

      <AddBrokerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddBroker}
      />
    </div>
  );
}

