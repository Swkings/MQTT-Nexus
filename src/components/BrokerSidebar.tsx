import React, { useState, useRef } from 'react';
import { Server, Plus, Trash2, Plug, Unplug, AlertCircle, Edit2, PanelLeftClose, PanelLeftOpen, Hash, X, Check } from 'lucide-react';
import { BrokerConfig } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

interface TopicSubscription {
  topic: string;
  subscribed: boolean;
}

interface BrokerSidebarProps {
  brokers: BrokerConfig[];
  activeBrokerId: string | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  errorMsg: string | null;
  subscriptions: string[];
  onSelect: (broker: BrokerConfig) => void;
  onAdd: () => void;
  onEdit: (broker: BrokerConfig) => void;
  onDelete: (id: string) => void;
  onSubscribe: (topic: string, qos: 0 | 1 | 2) => void;
  onUnsubscribe: (topic: string) => void;
  favoriteTopics: string[];
  setFavoriteTopics: React.Dispatch<React.SetStateAction<string[]>>;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function BrokerSidebar({
  brokers,
  activeBrokerId,
  status,
  errorMsg,
  subscriptions,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onSubscribe,
  onUnsubscribe,
  favoriteTopics,
  setFavoriteTopics,
  isCollapsed = false,
  onToggleCollapse,
}: BrokerSidebarProps) {
  const { theme, themeClasses } = useTheme();
  // favoriteTopics state is now managed by parent component via props
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  // State for inline add topic input
  const [showInlineInput, setShowInlineInput] = useState(false);
  const [inlineTopic, setInlineTopic] = useState('');
  const inlineInputRef = useRef<HTMLDivElement>(null);

  const handleToggleTopic = (topic: string, e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    // Click on topic tag should toggle subscription
    if (subscriptions.includes(topic)) {
      // Already subscribed, unsubscribe
      onUnsubscribe(topic);
    } else {
      // Not subscribed, subscribe
      onSubscribe(topic, 2);
    }
  };

  const handleDeleteTopic = (topic: string, e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    // Click on X button should delete from favorite list
    setFavoriteTopics(prev => prev.filter(t => t !== topic));
    // Also unsubscribe if currently subscribed
    if (subscriptions.includes(topic)) {
      onUnsubscribe(topic);
    }
  };

  const handleAddTopic = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowAddTopicModal(true);
    setNewTopic('');
  };

  const handleSaveTopic = () => {
    if (newTopic && newTopic.trim()) {
      const trimmedTopic = newTopic.trim();
      // Add to favorite list if not exists
      if (!favoriteTopics.includes(trimmedTopic)) {
        setFavoriteTopics(prev => [...prev, trimmedTopic]);
      }
      // Also subscribe immediately
      onSubscribe(trimmedTopic, 2);
      // Close modal
      setShowAddTopicModal(false);
      setNewTopic('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTopic();
    } else if (e.key === 'Escape') {
      setShowAddTopicModal(false);
    }
  };

  // Inline input handlers
  const handleShowInlineInput = () => {
    setShowInlineInput(true);
    setInlineTopic('');
  };

  const handleSaveInlineTopic = () => {
    if (inlineTopic && inlineTopic.trim()) {
      const trimmedTopic = inlineTopic.trim();
      if (!favoriteTopics.includes(trimmedTopic)) {
        setFavoriteTopics(prev => [...prev, trimmedTopic]);
      }
      onSubscribe(trimmedTopic, 2);
    }
    setShowInlineInput(false);
    setInlineTopic('');
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveInlineTopic();
    } else if (e.key === 'Escape') {
      setShowInlineInput(false);
    }
  };

  // Close inline input when mouse leaves the container
  const handleInlineMouseLeave = () => {
    setShowInlineInput(false);
  };

  return (
    <div className={cn(
      "backdrop-blur-xl border rounded-2xl flex flex-col h-full overflow-hidden transition-all duration-300",
      themeClasses.cardBg,
      themeClasses.border,
      themeClasses.shadow,
      isCollapsed && "opacity-50"
    )}>
      <div className={cn(
        "p-4 border-b shrink-0 flex items-center justify-between",
        themeClasses.border,
        themeClasses.panelBg
      )}>
        <h2 className={cn("text-sm font-semibold flex items-center gap-2", themeClasses.textPrimary)}>
          <Server className={cn("w-4 h-4", theme.mode === 'light' ? "text-cyan-600" : "text-cyan-400")} />
          Brokers
        </h2>
        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                themeClasses.textSecondary,
                "hover:text-cyan-400 hover:bg-cyan-500/10"
              )}
              title={isCollapsed ? "Expand Brokers" : "Collapse Brokers"}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={onAdd}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              themeClasses.textSecondary,
              "hover:text-cyan-400 hover:bg-cyan-500/10"
            )}
            title="Add Broker"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        <AnimatePresence initial={false}>
          {brokers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-slate-500 text-xs py-8"
            >
              No brokers added
            </motion.div>
          ) : (
            brokers.map((broker) => {
              const isActive = activeBrokerId === broker.id;
              const displayUrl = broker.url || `${broker.protocol}://${broker.host}:${broker.port}${broker.path}`;
              
              return (
                <motion.div
                  key={broker.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                  className={cn(
                    "group relative p-3 rounded-xl border transition-all overflow-hidden",
                    isActive
                      ? "bg-cyan-500/10 border-cyan-500/30 shadow-inner shadow-cyan-500/10"
                      : theme.mode === 'light'
                        ? "bg-white border-slate-300 hover:bg-slate-100 hover:border-slate-400"
                        : "bg-slate-900/40 border border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600"
                  )}
                >
                  {/* Card Content */}
                  <div className="flex flex-col gap-2">
                    {/* Card Header with Broker Info */}
                    <div className="flex items-start gap-2">
                      {/* Broker Info - Click to Select */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => onSelect(broker)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("font-medium text-sm truncate", themeClasses.textPrimary)}>
                            {broker.name}
                          </span>
                          {isActive && (
                            <span className="relative flex h-2 w-2 shrink-0">
                              {status === 'connected' && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              )}
                              <span className={cn(
                                "relative inline-flex rounded-full h-2 w-2",
                                status === 'connected' ? 'bg-emerald-500' :
                                status === 'connecting' ? 'bg-amber-500' :
                                status === 'error' ? 'bg-rose-500' : 'bg-slate-500'
                              )}></span>
                            </span>
                          )}
                        </div>
                        <div className={cn("text-xs font-mono truncate", themeClasses.textSecondary)} title={displayUrl}>
                          {displayUrl}
                        </div>
                      </div>

                      {/* Edit/Delete Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(broker);
                          }}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            theme.mode === 'light' 
                              ? "text-slate-400 hover:text-cyan-600 hover:bg-cyan-500/10" 
                              : "text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10"
                          )}
                          title="Edit Broker"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(broker.id);
                          }}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            theme.mode === 'light' 
                              ? "text-slate-400 hover:text-rose-600 hover:bg-rose-500/10" 
                              : "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                          )}
                          title="Delete Broker"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Error Message */}
                    {isActive && errorMsg && (
                      <div className={cn(
                        "flex items-start gap-1.5 p-2 rounded-lg border text-[10px] leading-tight",
                        theme.mode === 'light' 
                          ? "bg-rose-50 border-rose-200 text-rose-700" 
                          : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                      )}>
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        <p className="break-words">{errorMsg}</p>
                      </div>
                    )}

                    {/* Topics Section - Only for Active Broker */}
                    {isActive && (
                      <div className={cn("mt-1 pt-3 border-t relative", theme.mode === 'light' ? "border-slate-300" : "border-slate-700/50")}>
                        {/* Topic Tags */}
                        <div className="flex flex-wrap gap-1.5 items-center mb-2">
                          {/* Topic Tags */}
                          <AnimatePresence initial={false}>
                            {favoriteTopics.map((topic) => {
                              const isSubscribed = subscriptions.includes(topic);
                              return (
                                <motion.div
                                  key={topic}
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.8, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTopic(topic, e);
                                  }}
                                  className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-mono transition-all border",
                                    "max-w-[200px] cursor-pointer",
                                    "hover:shadow-md active:scale-95",
                                    isSubscribed
                                      ? theme.mode === 'light'
                                        ? "bg-cyan-100 text-cyan-700 border-cyan-300 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-700"
                                        : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-400"
                                      : theme.mode === 'light'
                                      ? "bg-slate-100 text-slate-600 border-slate-300 hover:bg-cyan-100 hover:border-cyan-300"
                                      : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-cyan-500/20 hover:border-cyan-500/30"
                                  )}
                                  title={isSubscribed ? "Click to unsubscribe" : "Click to subscribe"}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.stopPropagation();
                                      handleToggleTopic(topic, e);
                                    }
                                  }}
                                >
                                  <span className="break-all">{topic}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTopic(topic, e);
                                    }}
                                    className={cn(
                                      "cursor-pointer opacity-50 hover:opacity-100 transition-opacity p-0.5",
                                      theme.mode === 'light'
                                        ? "text-cyan-700 hover:text-rose-700"
                                        : "text-cyan-400 hover:text-rose-400"
                                    )}
                                    title="Delete from favorites"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                          {favoriteTopics.length === 0 && (
                            <div className={cn("text-xs py-2 px-3 rounded-md border border-dashed", themeClasses.textSecondary)}>
                              No favorite topics. Click + to add.
                            </div>
                          )}
                        </div>

                        {/* Connection Controls - Bottom Right */}
                        <div className="flex justify-end items-center gap-2">
                          {/* Inline Add Topic Input */}
                          <div 
                            className="relative flex items-center"
                            onMouseEnter={handleShowInlineInput}
                            onMouseLeave={handleInlineMouseLeave}
                          >
                            <AnimatePresence>
                              {showInlineInput && (
                                <motion.div
                                  initial={{ width: 0, opacity: 0 }}
                                  animate={{ width: 'auto', opacity: 1 }}
                                  exit={{ width: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <input
                                    type="text"
                                    value={inlineTopic}
                                    onChange={(e) => setInlineTopic(e.target.value)}
                                    onKeyDown={handleInlineKeyDown}
                                    placeholder="Topic..."
                                    className={cn(
                                      "w-48 px-3 py-1.5 rounded-md text-xs font-mono outline-none border transition-all",
                                      theme.mode === 'light'
                                        ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500"
                                        : "bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-cyan-500"
                                    )}
                                    autoFocus
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                            
                            {/* Save/Plus Button */}
                            <button
                              onClick={showInlineInput ? handleSaveInlineTopic : undefined}
                              disabled={status !== 'connected'}
                              className={cn(
                                "relative flex items-center justify-center p-2 rounded-md text-xs font-medium transition-all shrink-0",
                                status !== 'connected'
                                  ? theme.mode === 'light'
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                                  : showInlineInput
                                  ? theme.mode === 'light'
                                    ? "bg-cyan-500 text-white hover:bg-cyan-600 shadow-lg shadow-cyan-500/30"
                                    : "bg-cyan-600 text-white hover:bg-cyan-700"
                                  : theme.mode === 'light'
                                  ? "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
                                  : "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                              )}
                              title={showInlineInput ? "Save Topic" : "Add Topic"}
                            >
                              {showInlineInput ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          {/* Connection Button with Badge */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelect(broker);
                            }}
                            className={cn(
                              "relative flex items-center justify-center p-2 rounded-md text-xs font-medium transition-all shrink-0",
                              status === 'connected'
                                ? theme.mode === 'light'
                                  ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                  : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                                : status === 'connecting'
                                ? theme.mode === 'light'
                                  ? "bg-amber-100 text-amber-700 cursor-wait hover:bg-amber-200"
                                  : "bg-amber-500/20 text-amber-400 cursor-wait"
                                : theme.mode === 'light'
                                ? "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
                                : "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                            )}
                            title={status === 'connected' ? 'Disconnect' : status === 'connecting' ? 'Connecting...' : 'Connect'}
                          >
                            {/* Subscription Count Badge */}
                            {subscriptions.length > 0 && (
                              <span className={cn(
                                "absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold border",
                                theme.mode === 'light'
                                  ? "bg-cyan-500 text-white border-cyan-600"
                                  : "bg-cyan-600 text-white border-cyan-700"
                              )}>
                                {subscriptions.length}
                              </span>
                            )}
                            {status === 'connected' ? (
                              <Unplug className="w-4 h-4" />
                            ) : status === 'connecting' ? (
                              <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                            ) : (
                              <Plug className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Add Topic Modal */}
      <AddTopicModal
        isOpen={showAddTopicModal}
        onClose={() => setShowAddTopicModal(false)}
        onSave={handleSaveTopic}
        value={newTopic}
        onChange={setNewTopic}
        onKeyDown={handleKeyDown}
        theme={theme}
        themeClasses={themeClasses}
      />
    </div>
  );
}

// Add Topic Modal Component
function AddTopicModal({ 
  isOpen, 
  onClose, 
  onSave, 
  value, 
  onChange,
  onKeyDown,
  theme,
  themeClasses 
}: { 
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  theme: any;
  themeClasses: any;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        "relative z-10 w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden",
        themeClasses.panelBg,
        themeClasses.border
      )}>
        {/* Header */}
        <div className={cn(
          "px-6 py-4 border-b",
          themeClasses.border
        )}>
          <h3 className={cn("text-lg font-semibold", themeClasses.textPrimary)}>
            Add Favorite Topic
          </h3>
          <p className={cn("text-sm mt-1", themeClasses.textSecondary)}>
            Enter a topic to add to your favorites list
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className={cn("block text-sm font-medium mb-2", themeClasses.textPrimary)}>
                Topic
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="e.g., sensor/temp, device/+/status"
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl border transition-all outline-none",
                  "focus:ring-2 focus:ring-cyan-500/50",
                  themeClasses.inputBg,
                  theme.mode === 'light' 
                    ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400" 
                    : "border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500"
                )}
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={cn(
          "px-6 py-4 border-t flex justify-end gap-3",
          themeClasses.border,
          themeClasses.panelBg
        )}>
          <button
            onClick={onClose}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
              theme.mode === 'light'
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            )}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!value.trim()}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
              value.trim()
                ? "bg-cyan-500 text-white hover:bg-cyan-600 shadow-lg shadow-cyan-500/30"
                : theme.mode === 'light'
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            )}
          >
            Add Topic
          </button>
        </div>
      </div>
    </div>
  );
}
