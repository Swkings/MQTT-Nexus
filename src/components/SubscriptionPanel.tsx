import React, { useState } from 'react';
import { Rss, Plus, Trash2, Hash } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SubscriptionPanelProps {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  subscriptions: string[];
  onSubscribe: (topic: string, qos: 0 | 1 | 2) => void;
  onUnsubscribe: (topic: string) => void;
}

export function SubscriptionPanel({ status, subscriptions, onSubscribe, onUnsubscribe }: SubscriptionPanelProps) {
  const [topic, setTopic] = useState('#');
  const [qos, setQos] = useState<0 | 1 | 2>(0);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && status === 'connected') {
      onSubscribe(topic.trim(), qos);
      setTopic('');
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl shadow-black/50 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Rss className="w-5 h-5 text-purple-400" />
          Subscriptions
        </h2>
        <span className="bg-slate-900/50 text-slate-400 text-xs font-mono px-2 py-1 rounded-md border border-slate-700/50">
          {subscriptions.length} Active
        </span>
      </div>

      <form onSubmit={handleSubscribe} className="space-y-4 mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Hash className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={status !== 'connected'}
              className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors disabled:opacity-50"
              placeholder="sensor/+/temperature"
              required
            />
          </div>
          
          <select
            value={qos}
            onChange={(e) => setQos(Number(e.target.value) as 0 | 1 | 2)}
            disabled={status !== 'connected'}
            className="block w-20 pl-3 pr-8 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-900/50 text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-colors disabled:opacity-50 appearance-none"
          >
            <option value={0}>QoS 0</option>
            <option value={1}>QoS 1</option>
            <option value={2}>QoS 2</option>
          </select>
          
          <button
            type="submit"
            disabled={status !== 'connected' || !topic.trim()}
            className="flex-shrink-0 flex items-center justify-center p-2 border border-transparent rounded-lg shadow-sm text-white bg-purple-500 hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-purple-500 disabled:opacity-50 transition-all"
            title="Subscribe"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </form>

      <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
        <AnimatePresence initial={false}>
          {subscriptions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-slate-500 py-8"
            >
              <Rss className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">No active subscriptions</p>
              {status !== 'connected' && (
                <p className="text-xs mt-1 opacity-70">Connect to a broker first</p>
              )}
            </motion.div>
          ) : (
            <ul className="space-y-2">
              {subscriptions.map((sub) => (
                <motion.li
                  key={sub}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                  className="group flex items-center justify-between p-3 bg-slate-900/40 border border-slate-700/50 rounded-lg hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
                    <span className="font-mono text-sm text-slate-300 truncate" title={sub}>
                      {sub}
                    </span>
                  </div>
                  <button
                    onClick={() => onUnsubscribe(sub)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-md hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Unsubscribe"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
