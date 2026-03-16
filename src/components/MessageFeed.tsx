import React, { useState, useMemo } from 'react';
import { Activity, Trash2, Filter, Search, Play, Pause } from 'lucide-react';
import { MqttMessage } from '../hooks/useMqtt';
import { MessageCard } from './MessageCard';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface MessageFeedProps {
  messages: MqttMessage[];
  onClear: () => void;
}

export function MessageFeed({ messages, onClear }: MessageFeedProps) {
  const [filter, setFilter] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [showDiffByDefault, setShowDiffByDefault] = useState(true);
  
  // Pause logic: freeze the messages array when paused
  const [pausedMessages, setPausedMessages] = useState<MqttMessage[]>([]);

  const handlePauseToggle = () => {
    if (isPaused) {
      setIsPaused(false);
      setPausedMessages([]);
    } else {
      setIsPaused(true);
      setPausedMessages(messages);
    }
  };

  const displayMessages = isPaused ? pausedMessages : messages;

  const filteredMessages = useMemo(() => {
    if (!filter.trim()) return displayMessages;
    const lowerFilter = filter.toLowerCase();
    return displayMessages.filter(
      (msg) => 
        msg.topic.toLowerCase().includes(lowerFilter) || 
        msg.payload.toLowerCase().includes(lowerFilter)
    );
  }, [displayMessages, filter]);

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 flex flex-col h-full overflow-hidden">
      {/* Header & Toolbar */}
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-900/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Live Messages</h2>
              <p className="text-xs text-slate-400 font-mono">
                {messages.length} total {isPaused && <span className="text-amber-400 ml-1">(Paused)</span>}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePauseToggle}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                isPaused 
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30" 
                  : "bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700"
              )}
              title={isPaused ? "Resume feed" : "Pause feed"}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
            
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700/50 text-slate-300 border border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors">
              <input 
                type="checkbox" 
                checked={showDiffByDefault}
                onChange={(e) => setShowDiffByDefault(e.target.checked)}
                className="rounded border-slate-500 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
              />
              <span className="hidden sm:inline">Auto-Diff</span>
            </label>

            <button
              onClick={onClear}
              disabled={messages.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-50 transition-colors"
              title="Clear messages"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </div>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
            placeholder="Filter by topic or payload..."
          />
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-slate-900/10">
        <AnimatePresence initial={false}>
          {filteredMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-slate-500 py-12"
            >
              <div className="relative mb-4">
                <Activity className="w-16 h-16 opacity-20" />
                {!isPaused && (
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 border-2 border-emerald-500 rounded-full"
                  />
                )}
              </div>
              <p className="text-lg font-medium text-slate-400">Waiting for messages...</p>
              <p className="text-sm mt-2 max-w-sm text-center opacity-70">
                {filter ? "No messages match your filter criteria." : "Connect to a broker and subscribe to a topic to start receiving messages."}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredMessages.map((msg) => (
                <MessageCard 
                  key={msg.id} 
                  message={msg} 
                  showDiffByDefault={showDiffByDefault} 
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
