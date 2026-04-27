import React, { useMemo, useState, useRef } from 'react';
import { MqttMessage } from '../hooks/useMqtt';
import { DiffViewer } from './DiffViewer';
import { MessageCard } from './MessageCard';
import { ChartPanel } from './ChartPanel';
import { CodeGenModal } from './CodeGenModal';
import { Activity, SplitSquareHorizontal, Play, Pause, Trash2, History, Filter, LayoutTemplate, Columns, FileJson, ArrowDownUp, Calendar, Maximize2, Minimize2, X, Code2, Clock, Hash, Copy, Check, Search, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';

function getAllPaths(obj: any, prefix = '', isArrayElement = false): string[] {
  let paths: string[] = [];
  const fieldNames = new Set<string>(); // 收集所有字段名
  
  if (Array.isArray(obj)) {
    // Handle array - generate paths with index for each element
    obj.forEach((item, index) => {
      const path = prefix ? `${prefix}.${index}` : `${index}`;
      if (item && typeof item === 'object') {
        // Recursively get paths from array element, passing index as prefix
        paths = paths.concat(getAllPaths(item, path, true));
        // Also collect field names from array elements
        Object.keys(item).forEach(key => fieldNames.add(key));
      } else {
        // For primitive values in array, include the indexed path
        paths.push(path);
      }
    });
    
    // Add non-indexed field names for objects in array
    fieldNames.forEach(name => {
      paths.push(name);
    });
  } else if (obj && typeof obj === 'object') {
    // Handle object
    for (const key in obj) {
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (obj[key] && typeof obj[key] === 'object') {
        // For objects or arrays, recurse first
        const childPaths = getAllPaths(obj[key], path, Array.isArray(obj[key]));
        // Only add child paths if they exist
        if (childPaths.length > 0) {
          paths = paths.concat(childPaths);
        } else {
          // If no child paths (empty object/array), add this path
          paths.push(path);
        }
      } else {
        // For primitive values, add the path
        paths.push(path);
      }
    }
  }
  
  return paths;
}

function getValueByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

interface TopicViewProps {
  topic: string | null;
  messages: MqttMessage[];
  onClear: () => void;
}

export function TopicView({ topic, messages, onClear }: TopicViewProps) {
  const { theme, themeClasses } = useTheme();
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

  // Latest Message specific states
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');
  const fieldPickerTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // 清理字段选择器定时器
  React.useEffect(() => {
    return () => {
      if (fieldPickerTimerRef.current) {
        clearTimeout(fieldPickerTimerRef.current);
        fieldPickerTimerRef.current = null;
      }
    };
  }, []);

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

  const parsedLatestPayload = useMemo(() => {
    if (!latestMessage) return null;
    try {
      return JSON.parse(latestMessage.payload);
    } catch {
      return null;
    }
  }, [latestMessage]);

  const allLatestFields = useMemo(() => {
    if (!parsedLatestPayload) return [];
    return getAllPaths(parsedLatestPayload);
  }, [parsedLatestPayload]);

  const filteredLatestPayload = useMemo(() => {
    if (!showSelectedOnly || selectedFields.length === 0 || !parsedLatestPayload) {
      return latestMessage?.payload;
    }
    const filtered: any = {};
    selectedFields.forEach(path => {
      const val = getValueByPath(parsedLatestPayload, path);
      if (val !== undefined) {
        filtered[path] = val;
      }
    });
    return JSON.stringify(filtered, null, 2);
  }, [parsedLatestPayload, selectedFields, showSelectedOnly, latestMessage]);

  const filteredPreviousPayload = useMemo(() => {
    if (!showSelectedOnly || selectedFields.length === 0 || !latestMessage?.previousPayload) {
      return latestMessage?.previousPayload;
    }
    try {
      const prevParsed = JSON.parse(latestMessage.previousPayload);
      const filtered: any = {};
      selectedFields.forEach(path => {
        const val = getValueByPath(prevParsed, path);
        if (val !== undefined) {
          filtered[path] = val;
        }
      });
      return JSON.stringify(filtered, null, 2);
    } catch {
      return latestMessage.previousPayload;
    }
  }, [latestMessage, selectedFields, showSelectedOnly]);

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
          
          // Handle array index access (e.g., "0", "1", etc.)
          if (Array.isArray(val)) {
            const index = parseInt(key, 10);
            if (!isNaN(index) && index >= 0 && index < val.length) {
              // Specific index access (e.g., "0.name")
              val = val[index];
            } else if (isNaN(index)) {
              // Non-numeric key with array value - extract this field from all elements
              // e.g., path is "name" and val is array of objects
              const extracted = val
                .map((item: any) => {
                  if (item && typeof item === 'object') {
                    return item[key];
                  }
                  return undefined;
                })
                .filter((v: any) => v !== undefined && v !== null && v !== '');
              
              if (extracted.length === 0) {
                val = undefined;
              } else if (extracted.length === 1) {
                val = extracted[0];
              } else {
                // Multiple values - return as array for chart to handle
                val = extracted;
              }
            } else {
              // Invalid index
              val = undefined;
            }
          } else if (typeof val === 'object') {
            // Handle object property access
            val = val[key];
          } else {
            // If current value is not an object/array and we still have keys to process
            val = undefined;
          }
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
      <div className={cn(
        "backdrop-blur-xl flex flex-col h-full items-center justify-center",
        theme.overlay === 'transparent' ? 'bg-transparent' : themeClasses.cardBg,
        themeClasses.shadow,
        themeClasses.text
      )}>
        <Activity className="w-12 h-12 mb-4 opacity-20" />
        <p>Select a topic from the tree to view messages</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "backdrop-blur-xl border rounded-2xl flex flex-col overflow-hidden transition-all duration-300",
      theme.overlay === 'transparent' ? 'bg-transparent' : themeClasses.cardBg,
      themeClasses.border,
      themeClasses.shadow,
      isFullScreen ? "fixed inset-4 z-50 rounded-2xl" : "h-full"
    )}>
      {/* Header */}
      <div className={cn(
        "p-3 sm:p-4 border-b shrink-0",
        themeClasses.border,
        theme.overlay === 'transparent' ? 'bg-transparent' : themeClasses.panelBg
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className={cn("text-lg font-semibold flex items-center gap-2", themeClasses.textPrimary)}>
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] shrink-0" />
              <span className="truncate" title={topic}>{topic}</span>
            </h2>
            <p className={cn("text-xs font-mono", themeClasses.textSecondary)}>
              {topicMessages.length} messages {isPaused && <span className="text-amber-400 ml-1">(Paused)</span>}
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              onClick={() => setIsCodeGenOpen(true)}
              className={cn("p-1.5 rounded-lg border transition-colors", theme.overlay === 'transparent' ? theme.mode === 'light' ? "bg-white/50 text-slate-700 border-slate-300 hover:bg-slate-200/50" : "bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-700" : theme.mode === 'light' ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200" : "bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-700")}
              title="Generate Code Structure"
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className={cn("p-1.5 rounded-lg border transition-colors", theme.overlay === 'transparent' ? theme.mode === 'light' ? "bg-white/50 text-slate-700 border-slate-300 hover:bg-slate-200/50" : "bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-700" : theme.mode === 'light' ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200" : "bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-700")}
              title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
            >
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
                showHistory 
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30" 
                  : theme.overlay === 'transparent'
                    ? theme.mode === 'light'
                      ? "bg-white/50 text-slate-700 border-slate-300 hover:bg-slate-200/50"
                      : "bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-700"
                    : theme.mode === 'light' ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200" : "bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-700"
              )}
              title="Toggle History"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>

            <button
              onClick={handlePauseToggle}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
                isPaused 
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30" 
                  : theme.overlay === 'transparent'
                    ? theme.mode === 'light'
                      ? "bg-white/50 text-slate-700 border-slate-300 hover:bg-slate-200/50"
                      : "bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-700"
                    : theme.mode === 'light' ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200" : "bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-700"
              )}
              title={isPaused ? "Resume feed" : "Pause feed"}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              onClick={onClear}
              disabled={messages.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-50 transition-colors"
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
              <div className="p-3 sm:p-4 flex-1 flex flex-col overflow-hidden">
                <div className="flex flex-col gap-2 mb-3 shrink-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1 flex-wrap">
                      <h3 className={cn("text-sm font-medium flex items-center gap-2", themeClasses.textPrimary)}>
                        <SplitSquareHorizontal className="w-4 h-4 text-emerald-400" />
                        Latest Message
                      </h3>
                      <div className="flex items-center gap-1 flex-wrap">
                        <div className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono",
                          theme.overlay === 'transparent'
                            ? theme.mode === 'light'
                              ? "bg-white/50 border-slate-300 text-slate-700"
                              : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                            : theme.mode === 'light' 
                              ? "bg-slate-100 border-slate-300 text-slate-600" 
                              : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                        )}>
                          <Clock className={cn("w-3 h-3", theme.overlay === 'transparent' && theme.mode === 'light' ? "text-purple-600" : "text-purple-400")} />
                          <span>{format(latestMessage.timestamp, 'yyyy-MM-dd HH:mm:ss.SSS')}</span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(format(latestMessage.timestamp, 'yyyy-MM-dd HH:mm:ss.SSS'))}
                            className="ml-1 p-0.5 hover:text-cyan-400 transition-colors"
                            title="Copy formatted time"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono",
                          theme.overlay === 'transparent'
                            ? theme.mode === 'light'
                              ? "bg-white/50 border-slate-300 text-slate-700"
                              : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                            : theme.mode === 'light' 
                              ? "bg-slate-100 border-slate-300 text-slate-600" 
                              : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                        )}>
                          <Hash className={cn("w-3 h-3", theme.overlay === 'transparent' && theme.mode === 'light' ? "text-emerald-600" : "text-emerald-400")} />
                          <span>{latestMessage.timestamp}</span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(latestMessage.timestamp.toString())}
                            className="ml-1 p-0.5 hover:text-cyan-400 transition-colors"
                            title="Copy timestamp"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-mono",
                          theme.overlay === 'transparent'
                            ? theme.mode === 'light'
                              ? "bg-white/50 border-slate-300 text-slate-700"
                              : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                            : theme.mode === 'light' 
                              ? "bg-slate-100 border-slate-300 text-slate-600" 
                              : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                        )}>
                          <Activity className={cn("w-3 h-3", theme.overlay === 'transparent' && theme.mode === 'light' ? "text-cyan-600" : "text-cyan-500")} />
                          QoS {latestMessage.qos}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDiffMode('latest')}
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          diffMode === 'latest' ? "bg-purple-500/20 text-purple-400" : theme.overlay === 'transparent' ? "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50" : theme.mode === 'light' ? "text-slate-700 hover:bg-slate-200" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                        )}
                        title="Show Latest Message"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDiffMode('split')}
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          diffMode === 'split' ? "bg-purple-500/20 text-purple-400" : theme.overlay === 'transparent' ? "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50" : theme.mode === 'light' ? "text-slate-700 hover:bg-slate-200" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                        )}
                        title="Show Split Diff"
                      >
                        <Columns className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "relative flex items-center rounded-lg overflow-visible border",
                      theme.overlay === 'transparent'
                        ? theme.mode === 'light'
                          ? "bg-white/50 border-slate-300"
                          : "bg-slate-800/50 border-slate-700/50"
                        : theme.mode === 'light' 
                          ? "bg-slate-100 border-slate-300" 
                          : "bg-slate-800/50 border-slate-700/50"
                    )}
                      onMouseEnter={() => {
                        if (fieldPickerTimerRef.current) {
                          clearTimeout(fieldPickerTimerRef.current);
                          fieldPickerTimerRef.current = null;
                        }
                        setShowFieldPicker(true);
                      }}
                      onMouseLeave={() => {
                        fieldPickerTimerRef.current = setTimeout(() => {
                          setShowFieldPicker(false);
                          fieldPickerTimerRef.current = null;
                        }, 150);
                      }}
                    >
                      <button
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 text-xs font-medium transition-all border-r",
                          theme.overlay === 'transparent'
                            ? theme.mode === 'light'
                              ? "border-slate-300 text-slate-700 hover:bg-slate-200/50"
                              : "border-slate-700/50 text-slate-300 hover:bg-slate-700/50"
                            : theme.mode === 'light' 
                              ? "border-slate-300 text-slate-700 hover:bg-slate-200" 
                              : "border-slate-700/50 text-slate-300 hover:bg-slate-700",
                          showFieldPicker && (theme.mode === 'light' ? "text-indigo-600" : "text-indigo-300")
                        )}
                      >
                        <Filter className="w-3.5 h-3.5" />
                        Fields {selectedFields.length > 0 && `(${selectedFields.length})`}
                      </button>
                      <div className="relative flex items-center min-w-[150px]">
                        <Search className={cn("absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3", theme.overlay === 'transparent' && theme.mode === 'light' ? "text-slate-500" : theme.mode === 'light' ? "text-slate-400" : "text-slate-500")} />
                        <input
                          type="text"
                          placeholder="Search fields..."
                          value={fieldSearch}
                          onFocus={() => setShowFieldPicker(true)}
                          onChange={(e) => setFieldSearch(e.target.value)}
                          className={cn(
                            "w-full bg-transparent pl-6.5 pr-2 py-1 text-xs focus:outline-none transition-colors placeholder:text-slate-400",
                            theme.mode === 'light' ? "text-slate-700" : "text-slate-300"
                          )}
                        />
                      </div>

                      <AnimatePresence>
                        {showFieldPicker && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className={cn(
                              "absolute top-full left-0 mt-2 w-[450px] rounded-xl shadow-2xl z-50 p-4 border",
                              theme.overlay === 'transparent'
                                ? theme.mode === 'light'
                                  ? "bg-white/90 border-slate-300"
                                  : "bg-slate-900/90 border-slate-700"
                                : theme.mode === 'light' 
                                  ? "bg-white border-slate-300" 
                                  : "bg-slate-900 border-slate-700"
                            )}
                            onMouseEnter={() => {
                              if (fieldPickerTimerRef.current) {
                                clearTimeout(fieldPickerTimerRef.current);
                                fieldPickerTimerRef.current = null;
                              }
                              setShowFieldPicker(true);
                            }}
                            onMouseLeave={() => {
                              fieldPickerTimerRef.current = setTimeout(() => {
                                setShowFieldPicker(false);
                                fieldPickerTimerRef.current = null;
                              }, 150);
                            }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className={cn("text-[10px] uppercase tracking-wider font-bold", themeClasses.textSecondary)}>Select Fields to Monitor</span>
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => setSelectedFields([])}
                                  className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors"
                                >
                                  Clear All
                                </button>
                                <button 
                                  onClick={() => setShowFieldPicker(false)}
                                  className={cn("text-slate-500 hover:text-slate-300", themeClasses.textSecondary)}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                              {allLatestFields
                                .filter(field => field.toLowerCase().includes(fieldSearch.toLowerCase()))
                                .map(field => (
                                  <button
                                    key={field}
                                    onClick={() => setSelectedFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field])}
                                    className={cn(
                                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all border",
                                      selectedFields.includes(field)
                                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                                        : theme.overlay === 'transparent'
                                          ? theme.mode === 'light'
                                            ? "bg-white/50 text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-200/50"
                                            : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600 hover:bg-slate-700"
                                          : theme.mode === 'light' 
                                            ? "bg-slate-100 text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-200" 
                                            : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:bg-slate-700"
                                    )}
                                  >
                                    {selectedFields.includes(field) && <Check className="w-3 h-3" />}
                                    {field}
                                  </button>
                                ))}
                              {allLatestFields.filter(field => field.toLowerCase().includes(fieldSearch.toLowerCase())).length === 0 && (
                                <div className={cn("text-xs py-4 w-full text-center", themeClasses.textSecondary)}>No fields found matching "{fieldSearch}"</div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button
                      disabled={selectedFields.length === 0}
                      onClick={() => setShowSelectedOnly(!showSelectedOnly)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all border disabled:opacity-50 disabled:cursor-not-allowed",
                        showSelectedOnly 
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" 
                          : theme.overlay === 'transparent'
                            ? theme.mode === 'light'
                              ? "bg-white/50 text-slate-700 border-slate-300 hover:bg-slate-200/50"
                              : "bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-700"
                            : theme.mode === 'light' ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200" : "bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-700"
                      )}
                    >
                      {showSelectedOnly ? 'Show Full Data' : 'Show Selected Fields'}
                    </button>
                  </div>
                </div>

                <div className={cn(
                  "flex-1",
                  isFullScreen ? "overflow-y-auto scrollbar-hide" : "overflow-hidden"
                )}>
                  <DiffViewer 
                    oldValue={filteredPreviousPayload || filteredLatestPayload} 
                    newValue={filteredLatestPayload} 
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
                className={cn("border-l flex flex-col shrink-0 overflow-hidden", theme.overlay === 'transparent' ? theme.mode === 'light' ? "border-slate-300 bg-transparent" : "border-slate-700/30 bg-transparent" : theme.mode === 'light' ? "border-slate-300 bg-slate-100/50" : "border-slate-700/50 bg-slate-900/40")}
              >
                <div className={cn("p-3 border-b flex items-center justify-between shrink-0", theme.overlay === 'transparent' ? theme.mode === 'light' ? "border-slate-300 bg-white/20" : "border-slate-700/30 bg-slate-900/40" : theme.mode === 'light' ? "border-slate-300 bg-slate-200/50" : "border-slate-700/50 bg-slate-800/50")}>
                  <h3 className={cn("text-sm font-medium flex items-center gap-2", theme.mode === 'light' ? "text-slate-700" : "text-slate-300")}>
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Field Monitoring ({activeChartPaths.length})
                  </h3>
                  <button 
                    onClick={() => setActiveChartPaths([])}
                    className={cn("p-1 rounded transition-colors", theme.mode === 'light' ? "text-slate-500 hover:text-slate-700 hover:bg-slate-300" : "text-slate-500 hover:text-slate-300 hover:bg-slate-700")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                  {activeChartPaths.map(path => (
                    <div key={path} className={cn("border rounded-xl overflow-hidden", theme.overlay === 'transparent' ? theme.mode === 'light' ? 'bg-white/30 border-slate-300' : 'bg-slate-900/40 border-slate-700/50' : theme.mode === 'light' ? "bg-slate-200/30 border-slate-300" : "bg-slate-800/30 border-slate-700/50")}>
                      <ChartPanel 
                        data={getChartData(path)} 
                        path={path} 
                        onClose={() => toggleChartPath(path)} 
                        compact
                        isPaused={isPaused}
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
              className={cn("border-l flex flex-col shrink-0 relative", theme.overlay === 'transparent' ? theme.mode === 'light' ? 'border-slate-300 bg-transparent' : 'border-slate-700/30 bg-transparent' : theme.mode === 'light' ? "border-slate-300 bg-slate-100/20" : "border-slate-700/50 bg-slate-900/20")}
            >
              {/* Resize Handle */}
              <div
                onMouseDown={handleMouseDown}
                className={cn(
                  "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-cyan-500/50 transition-colors z-10",
                  isResizing && "bg-cyan-500"
                )}
              />

              <div className="p-3 border-b border-slate-700/50 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    History
                  </h3>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className={cn("p-1.5 rounded-md text-slate-400 hover:text-cyan-400 transition-colors", theme.overlay === 'transparent' ? "hover:bg-slate-800/50" : "hover:bg-slate-800")}
                    title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                  >
                    <ArrowDownUp className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Calendar className={cn("absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5", theme.overlay === 'transparent' && theme.mode === 'light' ? "text-slate-500" : theme.mode === 'light' ? "text-slate-400" : "text-slate-500")} />
                    <input
                      type="text"
                      placeholder="Search time (e.g. 14:54)"
                      value={searchTime}
                      onChange={(e) => setSearchTime(e.target.value)}
                      className={cn(
                        "w-full pl-8 pr-3 py-1.5 border rounded-md leading-5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500",
                        theme.overlay === 'transparent'
                          ? theme.mode === 'light'
                            ? "bg-white/50 border-slate-300 text-slate-900 placeholder-slate-400"
                            : "bg-slate-800/50 border-slate-600 text-slate-100 placeholder-slate-500"
                          : theme.mode === 'light' 
                            ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400" 
                            : "bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500"
                      )}
                    />
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                <AnimatePresence initial={false}>
                  {topicMessages.map(msg => (
                    <MessageCard key={msg.id} message={msg} showDiffByDefault={false} />
                  ))}
                </AnimatePresence>
                {topicMessages.length === 0 && (
                  <div className={cn("text-center py-8 text-sm", theme.overlay === 'transparent' ? "text-slate-500" : themeClasses.textSecondary)}>
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
        json={latestMessage ? (() => {
          try {
            return JSON.parse(latestMessage.payload);
          } catch {
            return null;
          }
        })() : null}
        topicName={topic}
      />
    </div>
  );
}
