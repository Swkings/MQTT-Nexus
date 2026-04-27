import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, FileJson, FileText, Activity, Clock, Copy, Filter, Check, Hash, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MqttMessage } from '../hooks/useMqtt';
import { DiffViewer, syntaxHighlight } from './DiffViewer';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';

function getAllPaths(obj: any, prefix = ''): string[] {
  let paths: string[] = [];
  
  if (Array.isArray(obj)) {
    // Handle array - generate paths with index for each element
    obj.forEach((item, index) => {
      const path = prefix ? `${prefix}.${index}` : `${index}`;
      if (item && typeof item === 'object') {
        // Recursively get paths from array element, passing index as prefix
        paths = paths.concat(getAllPaths(item, path));
      } else {
        // For primitive values in array, include the indexed path
        paths.push(path);
      }
    });
  } else if (obj && typeof obj === 'object') {
    // Handle object - only add leaf paths
    for (const key in obj) {
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (obj[key] && typeof obj[key] === 'object') {
        // For objects or arrays, recurse first
        const childPaths = getAllPaths(obj[key], path);
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

interface MessageCardProps {
  message: MqttMessage;
  showDiffByDefault?: boolean;
}

export function MessageCard({ message, showDiffByDefault = false }: MessageCardProps) {
  const { theme, themeClasses } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'raw' | 'formatted' | 'diff'>('formatted');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [showFieldPicker, setShowFieldPicker] = useState(false);

  // 检测数据类型
  const dataType = useMemo(() => {
    const payload = message.payload.trim();
    
    // 尝试 JSON
    try {
      JSON.parse(payload);
      return 'json';
    } catch {
      // 不是 JSON
    }
    
    // 尝试 XML
    if (payload.startsWith('<?xml') || (payload.startsWith('<') && payload.endsWith('>'))) {
      return 'xml';
    }
    
    // 尝试 HTML
    if (payload.startsWith('<!DOCTYPE html') || payload.startsWith('<html')) {
      return 'html';
    }
    
    // 纯文本
    return 'text';
  }, [message.payload]);

  const isJson = dataType === 'json';
  const isXml = dataType === 'xml';
  const isHtml = dataType === 'html';
  const isText = dataType === 'text';

  const parsedPayload = useMemo(() => {
    if (!isJson) return null;
    try {
      return JSON.parse(message.payload);
    } catch {
      return null;
    }
  }, [message.payload, isJson]);

  const allFields = useMemo(() => {
    if (!parsedPayload) return [];
    return getAllPaths(parsedPayload);
  }, [parsedPayload]);

  const filteredPayload = useMemo(() => {
    if (!showSelectedOnly || selectedFields.length === 0 || !parsedPayload) {
      return parsedPayload;
    }
    const filtered: any = {};
    selectedFields.forEach(path => {
      const val = getValueByPath(parsedPayload, path);
      if (val !== undefined) {
        // Simple flat object for filtered view
        filtered[path] = val;
      }
    });
    return filtered;
  }, [parsedPayload, selectedFields, showSelectedOnly]);

  const formattedPayload = useMemo(() => {
    if (isJson) {
      try {
        const data = showSelectedOnly ? filteredPayload : parsedPayload;
        return JSON.stringify(data, null, 2);
      } catch {
        return message.payload;
      }
    }
    // XML 和 HTML 保持原样，但可以进行简单的格式化
    if (isXml || isHtml) {
      return message.payload;
    }
    // 纯文本
    return message.payload;
  }, [message.payload, isJson, isXml, isHtml, parsedPayload, filteredPayload, showSelectedOnly]);

  const handleCopy = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
  };

  const toggleField = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={cn(
        "backdrop-blur-xl border rounded-xl p-3 transition-all duration-300 cursor-pointer group/message",
        themeClasses.cardBg,
        themeClasses.border,
        themeClasses.shadow,
        themeClasses.text,
        "hover:shadow-2xl hover:border-opacity-50",
        theme.mode === 'light' ? "hover:bg-slate-200/50" : "hover:bg-slate-800/50"
      )}
    >
      {/* Header */}
      <div 
        className={cn(
          "px-3 py-2 flex flex-col gap-1.5 cursor-pointer transition-colors",
          theme.mode === 'light' ? "hover:bg-slate-200/50" : "hover:bg-slate-800/50"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={cn("flex-shrink-0 w-2 h-2 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]", theme.mode === 'light' ? "bg-cyan-600" : "bg-cyan-400")} />
            <span className={cn("font-mono text-sm font-semibold truncate max-w-[200px] sm:max-w-xs md:max-w-md", themeClasses.textPrimary)}>
              {message.topic}
            </span>
            {/* 数据类型标签 */}
            <span className={cn(
              "px-2 py-0.5 rounded text-xs font-medium shrink-0",
              isJson && (theme.mode === 'light' ? "bg-blue-100 text-blue-700 border border-blue-300" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"),
              isXml && (theme.mode === 'light' ? "bg-orange-100 text-orange-700 border border-orange-300" : "bg-orange-500/20 text-orange-400 border border-orange-500/30"),
              isHtml && (theme.mode === 'light' ? "bg-red-100 text-red-700 border border-red-300" : "bg-red-500/20 text-red-400 border border-red-500/30"),
              isText && (theme.mode === 'light' ? "bg-slate-200 text-slate-700 border border-slate-300" : "bg-slate-500/20 text-slate-400 border border-slate-500/30")
            )}>
              {isJson && 'JSON'}
              {isXml && 'XML'}
              {isHtml && 'HTML'}
              {isText && 'TEXT'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("text-xs font-mono truncate max-w-[100px] sm:max-w-[200px]", themeClasses.textSecondary)}>
              {!expanded && (isJson ? '{...}' : message.payload.substring(0, 30) + (message.payload.length > 30 ? '...' : ''))}
            </div>
            <button className={cn("transition-colors p-1 rounded-md", themeClasses.textSecondary, theme.mode === 'light' ? "hover:text-cyan-600 hover:bg-slate-200" : "hover:text-cyan-400 hover:bg-slate-700/50")}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className={cn("flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs font-mono", themeClasses.textSecondary)}>
          <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border", themeClasses.border, theme.mode === 'light' ? "bg-slate-200 text-slate-700" : "bg-slate-900/50 text-slate-300")}>
            <Activity className="w-2.5 h-2.5 text-cyan-500" /> QoS {message.qos}
          </span>
          
          <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border group/time", themeClasses.border, theme.mode === 'light' ? "bg-slate-200 text-slate-700" : "bg-slate-900/50 text-slate-300")}>
            <Clock className={cn("w-2.5 h-2.5", theme.mode === 'light' ? "text-purple-600" : "text-purple-400")} />
            <span className="font-mono text-xs">{format(message.timestamp, 'HH:mm:ss')}</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(format(message.timestamp, 'yyyy-MM-dd HH:mm:ss.SSS'));
              }}
              className={cn("opacity-0 group-hover/time:opacity-100 p-0.5 rounded transition-all", theme.mode === 'light' ? "hover:bg-slate-300 hover:text-cyan-600" : "hover:bg-slate-700 hover:text-cyan-400")}
              title="Copy formatted time"
            >
              <Copy className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border group/ts", themeClasses.border, theme.mode === 'light' ? "bg-slate-200 text-slate-700" : "bg-slate-900/50 text-slate-300")}>
            <Hash className={cn("w-2.5 h-2.5", theme.mode === 'light' ? "text-emerald-600" : "text-emerald-400")} />
            <span className="font-mono text-xs">{message.timestamp}</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(message.timestamp.toString());
              }}
              className={cn("opacity-0 group-hover/ts:opacity-100 p-0.5 rounded transition-all", theme.mode === 'light' ? "hover:bg-slate-300 hover:text-cyan-600" : "hover:bg-slate-700 hover:text-cyan-400")}
              title="Copy timestamp"
            >
              <Copy className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn("border-t", theme.mode === 'light' ? "border-slate-300" : "border-slate-700/50")}
          >
            <div className={cn("p-3", theme.mode === 'light' ? "bg-slate-100/50" : "bg-slate-900/30")}>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setViewMode('formatted'); }}
                  className={cn(
                    "px-2 py-1 rounded-lg text-xs font-medium transition-all border",
                    viewMode === 'formatted'
                      ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                      : theme.mode === 'light' ? "bg-slate-200 text-slate-700 border border-slate-300 hover:bg-slate-300" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                  )}
                >
                  Formatted
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setViewMode('raw'); }}
                  className={cn(
                    "px-2 py-1 rounded-lg text-xs font-medium transition-all border",
                    viewMode === 'raw'
                      ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                      : theme.mode === 'light' ? "bg-slate-200 text-slate-700 border border-slate-300 hover:bg-slate-300" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                  )}
                >
                  Raw
                </button>
                {message.previousPayload && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewMode('diff'); }}
                    className={cn(
                      "px-2 py-1 rounded-lg text-xs font-medium transition-all border",
                      viewMode === 'diff'
                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                        : theme.mode === 'light' ? "bg-slate-200 text-slate-700 border border-slate-300 hover:bg-slate-300" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                    )}
                  >
                    Diff
                  </button>
                )}

                <div className="h-4 w-px mx-1 hidden sm:block" style={{ backgroundColor: theme.mode === 'light' ? '#cbd5e1' : '#334155' }}></div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFieldPicker(true); }}
                  className={cn(
                    "px-2 py-1 rounded-lg text-xs font-medium transition-all border",
                    showFieldPicker ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : theme.mode === 'light' ? "bg-slate-200 text-slate-700 border border-slate-300 hover:bg-slate-300" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                  )}
                >
                  Fields
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSelectedOnly(!showSelectedOnly); }}
                  disabled={selectedFields.length === 0}
                  className={cn(
                    "px-2 py-1 rounded-lg text-xs font-medium transition-all border disabled:opacity-50 disabled:cursor-not-allowed",
                    showSelectedOnly ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : theme.mode === 'light' ? "bg-slate-200 text-slate-700 border border-slate-300 hover:bg-slate-300" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                  )}
                >
                  Selected Only
                </button>
              </div>

              {/* Field Picker */}
              <AnimatePresence>
                {showFieldPicker && isJson && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-3 border rounded-lg p-3 overflow-hidden"
                    style={{
                      backgroundColor: theme.mode === 'light' ? 'rgba(241, 245, 249, 0.5)' : 'rgba(15, 23, 42, 0.5)',
                      borderColor: theme.mode === 'light' ? '#cbd5e1' : 'rgba(71, 85, 105, 0.5)'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn("text-[10px] uppercase tracking-wider font-bold", theme.mode === 'light' ? "text-slate-500" : "text-slate-400")}>Select Fields to Display</span>
                      <button 
                        onClick={() => setSelectedFields([])}
                        className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto custom-scrollbar p-1">
                      {allFields.map(field => (
                        <button
                          key={field}
                          onClick={() => toggleField(field)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-all border",
                            selectedFields.includes(field)
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                              : theme.mode === 'light' ? "bg-slate-200 text-slate-700 border-slate-300 hover:border-slate-400" : "bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600"
                          )}
                        >
                          {selectedFields.includes(field) && <Check className="w-2.5 h-2.5" />}
                          {field}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Content Area */}
              <div className="relative group/copy">
                {viewMode === 'diff' && message.previousPayload ? (
                  <DiffViewer oldValue={message.previousPayload} newValue={message.payload} />
                ) : (
                  <pre className={cn(
                    "font-mono text-xs whitespace-pre-wrap overflow-x-auto p-4 rounded-md max-h-[400px] overflow-y-auto custom-scrollbar", 
                    theme.mode === 'light' 
                      ? "bg-slate-100 text-slate-900 border border-slate-300 shadow-sm" 
                      : "bg-slate-900/80 text-slate-200 border border-slate-700/50 shadow-inner"
                  )}>
                    {viewMode === 'formatted' && isJson ? (
                      <code dangerouslySetInnerHTML={{ __html: syntaxHighlight(formattedPayload) }} />
                    ) : viewMode === 'formatted' && isXml ? (
                      <code className={theme.mode === 'light' ? "text-orange-700" : "text-orange-300"}>{formattedPayload}</code>
                    ) : viewMode === 'formatted' && isHtml ? (
                      <code className={theme.mode === 'light' ? "text-red-700" : "text-red-300"}>{formattedPayload}</code>
                    ) : (
                      <code>{viewMode === 'formatted' ? formattedPayload : message.payload}</code>
                    )}
                  </pre>
                )}
                
                <button 
                  onClick={() => handleCopy(viewMode === 'formatted' ? formattedPayload : message.payload)}
                  className={cn("absolute top-2 right-2 p-1.5 rounded-md border opacity-0 group-hover/copy:opacity-100 transition-all backdrop-blur-sm", theme.mode === 'light' ? "bg-slate-300/80 hover:bg-cyan-100/50 text-slate-700 hover:text-cyan-700 border-slate-300" : "bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border-slate-700/50")}
                  title="Copy to clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
