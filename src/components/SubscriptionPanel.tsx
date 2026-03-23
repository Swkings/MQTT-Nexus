import React, { useState } from 'react';
import { Rss, Plus, Trash2, Hash, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

interface SubscriptionPanelProps {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  subscriptions: string[];
  onSubscribe: (topic: string, qos: 0 | 1 | 2) => void;
  onUnsubscribe: (topic: string) => void;
  messageLimit: number;
  setMessageLimit: (limit: number) => void;
}

export function SubscriptionPanel({ status, subscriptions, onSubscribe, onUnsubscribe, messageLimit, setMessageLimit }: SubscriptionPanelProps) {
  const { theme, themeClasses } = useTheme();
  const [topic, setTopic] = useState('#');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && status === 'connected') {
      onSubscribe(topic.trim(), 2);
      setTopic('');
    }
  };

  return (
    <div className={cn(
      "backdrop-blur-xl border rounded-2xl shadow-2xl flex flex-col transition-all duration-300",
      themeClasses.cardBg,
      themeClasses.border,
      themeClasses.shadow
    )}>
      <div 
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer rounded-t-2xl transition-colors border-b",
          themeClasses.border,
          "hover:bg-slate-700/30"
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h2 className={cn("text-lg font-semibold flex items-center gap-2", themeClasses.textPrimary)}>
          <Rss className={cn("w-5 h-5", theme.mode === 'light' ? "text-purple-600" : "text-purple-400")} />
          Subscriptions
        </h2>
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-xs font-mono px-2 py-1 rounded-md border transition-colors",
            theme.mode === 'light' 
              ? "bg-purple-50 border-purple-200 text-purple-700" 
              : "bg-purple-900/30 border-purple-700/50 text-purple-300"
          )}>
            {subscriptions.length} Active
          </span>
          <button className={cn("transition-colors", themeClasses.textSecondary, "hover:text-cyan-400")}>
            {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col overflow-hidden"
          >
            <div className="px-6 pb-6 flex flex-col">
              <div className={cn(
                "flex items-center justify-between mb-4 p-2.5 rounded-lg border",
                themeClasses.border,
                theme.overlay === 'transparent' ? "bg-slate-900/30" : themeClasses.bgTertiary
              )}>
                <span className={cn("text-xs font-medium flex items-center gap-2", themeClasses.textSecondary)}>
                  <Database className="w-3.5 h-3.5" />
                  History Limit (per topic)
                </span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={messageLimit}
                  onChange={(e) => setMessageLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 text-xs border rounded text-center focus:outline-none focus:border-purple-500 transition-colors"
                  style={{
                    backgroundColor: theme.overlay === 'transparent' ? 'rgba(30, 41, 59, 0.5)' : undefined,
                    borderColor: theme.overlay === 'transparent' ? 'rgba(71, 85, 105, 0.5)' : undefined,
                    color: theme.mode === 'dark' ? '#94a3b8' : '#475569'
                  }}
                />
              </div>

              <form onSubmit={handleSubscribe} className="space-y-4 mb-6">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Hash className={cn("h-4 w-4", theme.mode === 'light' ? "text-slate-400" : "text-slate-500")} />
                    </div>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      disabled={status !== 'connected'}
                      className={cn(
                        "block w-full pl-10 pr-3 py-2 border rounded-lg leading-5 text-sm transition-colors disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500",
                        theme.mode === 'light' ? "bg-slate-100 placeholder-slate-500 text-slate-800 border-slate-300 hover:border-slate-400" : "bg-slate-900/50 text-slate-300 placeholder-slate-500 border-slate-700"
                      )}
                      placeholder="sensor/+/temperature"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={status !== 'connected' || !topic.trim()}
                    className={cn("flex-shrink-0 flex items-center justify-center p-2 border border-transparent rounded-lg shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-purple-500 disabled:opacity-50 transition-all", theme.mode === 'light' ? "bg-purple-600 hover:bg-purple-700" : "bg-purple-500 hover:bg-purple-600")}
                    title="Subscribe"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </form>

              <div className="overflow-y-auto custom-scrollbar -mx-2 px-2 max-h-[250px] min-h-[100px]">
                <AnimatePresence initial={false}>
                  {subscriptions.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn("h-full flex flex-col items-center justify-center py-8", theme.mode === 'light' ? "text-slate-500" : "text-slate-400")}
                    >
                      <Rss className={cn("w-12 h-12 mb-3 opacity-20", theme.mode === 'light' ? "text-slate-400" : "text-slate-500")} />
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
                          className={cn("group flex items-center justify-between p-3 rounded-lg transition-colors", theme.mode === 'light' ? "bg-slate-200/50 border border-slate-300 hover:bg-slate-200" : "bg-slate-900/40 border border-slate-700/50 hover:bg-slate-800/60")}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(192,132,252,0.8)]", theme.mode === 'light' ? "bg-purple-600" : "bg-purple-400")} />
                            <span className={cn("font-mono text-sm truncate", theme.mode === 'light' ? "text-slate-700" : "text-slate-300")} title={sub}>
                              {sub}
                            </span>
                          </div>
                          <button
                            onClick={() => onUnsubscribe(sub)}
                            className={cn("transition-colors", theme.mode === 'light' ? "text-slate-500 hover:text-rose-600" : "text-slate-500 hover:text-rose-400")} 
                            style={{ 
                              paddingLeft: '1.5rem', 
                              paddingRight: '1.5rem',
                              paddingTop: '0.375rem',
                              paddingBottom: '0.375rem',
                              borderRadius: '0.375rem'
                            }}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
