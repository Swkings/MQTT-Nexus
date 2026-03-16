/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useMqtt } from './hooks/useMqtt';
import { ConnectionPanel } from './components/ConnectionPanel';
import { SubscriptionPanel } from './components/SubscriptionPanel';
import { MessageFeed } from './components/MessageFeed';
import { Activity } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-cyan-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 min-h-screen lg:h-screen flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between mb-6 lg:mb-8">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 shadow-lg shadow-cyan-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">MQTT Nexus</h1>
              <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">Real-time Telemetry Client</p>
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-6 min-h-0 pb-4 lg:pb-0">
          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:h-full overflow-y-auto custom-scrollbar pr-2 lg:pr-0">
            <ConnectionPanel
              status={status}
              errorMsg={errorMsg}
              onConnect={connect}
              onDisconnect={disconnect}
            />
            
            <SubscriptionPanel
              status={status}
              subscriptions={subscriptions}
              onSubscribe={subscribe}
              onUnsubscribe={unsubscribe}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 flex flex-col h-[600px] lg:h-full">
            <MessageFeed
              messages={messages}
              onClear={clearMessages}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

