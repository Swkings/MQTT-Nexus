import React, { useMemo, useState } from 'react';
import { MqttMessage } from '../hooks/useMqtt';
import { DiffViewer } from './DiffViewer';
import { MessageCard } from './MessageCard';
import { Activity, SplitSquareHorizontal, Play, Pause, Trash2, History, Filter, LayoutTemplate, Columns, FileJson, ArrowDownUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface TopicViewProps {
  topic: string | null;
  messages: MqttMessage[];
  onClear: () => void;
}

export function TopicView({ topic, messages, onClear }: TopicViewProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [pausedMessages, setPausedMessages] = useState<MqttMessage[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [diffMode, setDiffMode] = useState<'inline' | 'latest' | 'split'>('inline');
  const [timeFilter, setTimeFilter] = useState<'all' | '1m' | '5m' | '15m'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  const topicMessages = useMemo(() => {
    if (!topic) return [];
    let filtered = displayMessages.filter(m => m.topic === topic);
    
    if (timeFilter !== 'all') {
      const now = Date.now();
      const timeLimit = timeFilter === '1m' ? 60000 : timeFilter === '5m' ? 300000 : 900000;
      filtered = filtered.filter(m => now - m.timestamp >= timeLimit);
    }
    
    // Default messages are descending (newest first).
    if (sortOrder === 'asc') {
      return [...filtered].reverse();
    }
    
    return filtered;
  }, [topic, displayMessages, timeFilter, sortOrder]);

  const latestMessage = useMemo(() => {
    if (!topic) return null;
    return displayMessages.find(m => m.topic === topic);
  }, [topic, displayMessages]);

  if (!topic) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 flex flex-col h-full items-center justify-center text-slate-500">
        <Activity className="w-12 h-12 mb-4 opacity-20" />
        <p>Select a topic from the tree to view messages</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-900/20 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] shrink-0" />
              <span className="truncate max-w-[250px] sm:max-w-md" title={topic}>{topic}</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              {topicMessages.length} messages {isPaused && <span className="text-amber-400 ml-1">(Paused)</span>}
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                showHistory 
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30" 
                  : "bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700"
              )}
              title="Toggle History"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </button>

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

            <button
              onClick={onClear}
              disabled={messages.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-50 transition-colors"
              title="Clear all messages"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Real-time Diff Window */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {latestMessage ? (
            <div className="p-4 sm:p-6 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <SplitSquareHorizontal className="w-4 h-4 text-emerald-400" />
                  Latest Message
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDiffMode('latest')}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      diffMode === 'latest' ? "bg-cyan-500/20 text-cyan-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    )}
                    title="Show Latest Data"
                  >
                    <FileJson className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDiffMode('inline')}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      diffMode === 'inline' ? "bg-emerald-500/20 text-emerald-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    )}
                    title="Show Inline Diff"
                  >
                    <LayoutTemplate className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDiffMode('split')}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      diffMode === 'split' ? "bg-purple-500/20 text-purple-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    )}
                    title="Show Split Diff"
                  >
                    <Columns className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <DiffViewer 
                  oldValue={latestMessage.previousPayload || latestMessage.payload} 
                  newValue={latestMessage.payload} 
                  viewMode={diffMode}
                  className="h-full"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              No messages received yet
            </div>
          )}
        </div>

        {/* Message History Sidebar */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-slate-700/50 flex flex-col bg-slate-900/20 shrink-0"
            >
              <div className="p-4 border-b border-slate-700/50 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    History
                  </h3>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-1.5 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                    title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                  >
                    <ArrowDownUp className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value as any)}
                    className="bg-slate-800 border border-slate-700 text-slate-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500 w-full"
                  >
                    <option value="all">All Time</option>
                    <option value="1m">Last 1 Minute</option>
                    <option value="5m">Last 5 Minutes</option>
                    <option value="15m">Last 15 Minutes</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                <AnimatePresence initial={false}>
                  {topicMessages.map(msg => (
                    <MessageCard key={msg.id} message={msg} showDiffByDefault={false} />
                  ))}
                </AnimatePresence>
                {topicMessages.length === 0 && (
                  <div className="text-center text-slate-500 py-8 text-sm">
                    No messages found for the selected time range.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
