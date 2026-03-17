import React, { useMemo, useState } from 'react';
import { MqttMessage } from '../hooks/useMqtt';
import { DiffViewer } from './DiffViewer';
import { MessageCard } from './MessageCard';
import { Activity, SplitSquareHorizontal, Play, Pause, Trash2 } from 'lucide-react';
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
    return displayMessages.filter(m => m.topic === topic);
  }, [topic, displayMessages]);

  const latestMessage = topicMessages[0];

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
          
          <div className="flex items-center gap-2 shrink-0">
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

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        {/* Real-time Diff Window */}
        {latestMessage && latestMessage.previousPayload && (
          <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-900/40 shrink-0">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <SplitSquareHorizontal className="w-4 h-4 text-emerald-400" />
              Real-time Diff (Latest vs Previous)
            </h3>
            <DiffViewer 
              oldValue={latestMessage.previousPayload} 
              newValue={latestMessage.payload} 
              className="max-h-[300px] overflow-y-auto"
            />
          </div>
        )}

        {/* Message History */}
        <div className="p-4 sm:p-6 flex-1">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Message History</h3>
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {topicMessages.map(msg => (
                <MessageCard key={msg.id} message={msg} showDiffByDefault={false} />
              ))}
            </AnimatePresence>
            {topicMessages.length === 0 && (
              <div className="text-center text-slate-500 py-8 text-sm">
                No messages for this topic yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
