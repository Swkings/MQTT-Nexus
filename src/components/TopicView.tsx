import React, { useMemo, useState } from 'react';
import { MqttMessage } from '../hooks/useMqtt';
import { DiffViewer } from './DiffViewer';
import { MessageCard } from './MessageCard';
import { ChartPanel } from './ChartPanel';
import { CodeGenModal } from './CodeGenModal';
import { Activity, SplitSquareHorizontal, Play, Pause, Trash2, History, Filter, LayoutTemplate, Columns, FileJson, ArrowDownUp, Calendar, Maximize2, Minimize2, X, Code2 } from 'lucide-react';
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
  const [searchTime, setSearchTime] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activeChartPaths, setActiveChartPaths] = useState<string[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isCodeGenOpen, setIsCodeGenOpen] = useState(false);
  const [historyWidth, setHistoryWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < 800) {
        setHistoryWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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
    
    if (searchTime) {
      filtered = filtered.filter(m => 
        new Date(m.timestamp).toLocaleTimeString().toLowerCase().includes(searchTime.toLowerCase())
      );
    }
    
    // Default messages are descending (newest first).
    if (sortOrder === 'asc') {
      return [...filtered].reverse();
    }
    
    return filtered;
  }, [topic, displayMessages, searchTime, sortOrder]);

  const latestMessage = useMemo(() => {
    if (!topic) return null;
    return displayMessages.find(m => m.topic === topic);
  }, [topic, displayMessages]);

  const toggleChartPath = (path: string) => {
    setActiveChartPaths(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const getChartData = (path: string) => {
    if (!topicMessages.length) return [];
    
    // Sort chronologically (oldest to newest)
    const sortedMessages = [...topicMessages].sort((a, b) => a.timestamp - b.timestamp);
    
    return sortedMessages.map(msg => {
      try {
        const payload = JSON.parse(msg.payload);
        const keys = path.split('.');
        let val: any = payload;
        for (const key of keys) {
          if (val === undefined || val === null) break;
          val = val[key];
        }
        
        return {
          time: new Date(msg.timestamp).toLocaleTimeString(),
          timestamp: msg.timestamp,
          value: val
        };
      } catch {
        return { time: new Date(msg.timestamp).toLocaleTimeString(), timestamp: msg.timestamp, value: null };
      }
    }).filter(d => d.value !== null && d.value !== undefined);
  };

  if (!topic) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 flex flex-col h-full items-center justify-center text-slate-500">
        <Activity className="w-12 h-12 mb-4 opacity-20" />
        <p>Select a topic from the tree to view messages</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden transition-all duration-300",
      isFullScreen ? "fixed inset-4 z-50 rounded-2xl" : "h-full"
    )}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-900/20 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] shrink-0" />
              <span className="truncate" title={topic}>{topic}</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              {topicMessages.length} messages {isPaused && <span className="text-amber-400 ml-1">(Paused)</span>}
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => setIsCodeGenOpen(true)}
              className="p-2 bg-slate-700/50 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
              title="Generate Code Structure"
            >
              <Code2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 bg-slate-700/50 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
              title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

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
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Real-time Diff Window */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {latestMessage ? (
              <div className="p-4 sm:p-6 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <div className="flex items-center gap-4">
                    <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <SplitSquareHorizontal className="w-4 h-4 text-emerald-400" />
                      Latest Message
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono bg-slate-800/50 px-2 py-1 rounded-md border border-slate-700/50">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(latestMessage.timestamp).toLocaleString()}
                      </span>
                      <span className="w-px h-3 bg-slate-700"></span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        QoS {latestMessage.qos}
                      </span>
                    </div>
                  </div>
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
                <div className={cn(
                  "flex-1",
                  isFullScreen ? "overflow-y-auto scrollbar-hide" : "overflow-hidden"
                )}>
                  <DiffViewer 
                    oldValue={latestMessage.previousPayload || latestMessage.payload} 
                    newValue={latestMessage.payload} 
                    viewMode={diffMode}
                    className={cn(
                      isFullScreen ? "min-h-full" : "h-full"
                    )}
                    onChartClick={toggleChartPath}
                    activeChartPaths={activeChartPaths}
                    noScroll={isFullScreen}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                No messages received yet
              </div>
            )}
          </div>

          {/* Charts Sidebar */}
          <AnimatePresence>
            {activeChartPaths.length > 0 && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 450, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-l border-slate-700/50 flex flex-col bg-slate-900/40 shrink-0 overflow-hidden"
              >
                <div className="p-4 border-b border-slate-700/50 bg-slate-800/50 flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Field Monitoring ({activeChartPaths.length})
                  </h3>
                  <button 
                    onClick={() => setActiveChartPaths([])}
                    className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                  {activeChartPaths.map(path => (
                    <div key={path} className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
                      <ChartPanel 
                        data={getChartData(path)} 
                        path={path} 
                        onClose={() => toggleChartPath(path)} 
                        compact
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Message History Sidebar */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: historyWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-slate-700/50 flex flex-col bg-slate-900/20 shrink-0 relative"
            >
              {/* Resize Handle */}
              <div
                onMouseDown={handleMouseDown}
                className={cn(
                  "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-cyan-500/50 transition-colors z-10",
                  isResizing && "bg-cyan-500"
                )}
              />

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
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search time (e.g. 14:54)"
                      value={searchTime}
                      onChange={(e) => setSearchTime(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-slate-300 rounded-md pl-8 pr-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 w-full"
                    />
                  </div>
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
                    No messages found for the selected time.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CodeGenModal 
        isOpen={isCodeGenOpen} 
        onClose={() => setIsCodeGenOpen(false)} 
        json={latestMessage ? JSON.parse(latestMessage.payload) : null}
        topicName={topic}
      />
    </div>
  );
}
