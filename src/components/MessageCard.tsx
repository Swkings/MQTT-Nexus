import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, FileJson, FileText, Activity, Clock, Copy, Filter, Check, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MqttMessage } from '../hooks/useMqtt';
import { DiffViewer, syntaxHighlight } from './DiffViewer';
import { cn } from '../lib/utils';

function getAllPaths(obj: any, prefix = ''): string[] {
  let paths: string[] = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const key in obj) {
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(path);
      paths = paths.concat(getAllPaths(obj[key], path));
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
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'raw' | 'formatted' | 'diff'>('formatted');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [showFieldPicker, setShowFieldPicker] = useState(false);

  const isJson = useMemo(() => {
    try {
      JSON.parse(message.payload);
      return true;
    } catch {
      return false;
    }
  }, [message.payload]);

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
    if (!isJson) return message.payload;
    try {
      const data = showSelectedOnly ? filteredPayload : parsedPayload;
      return JSON.stringify(data, null, 2);
    } catch {
      return message.payload;
    }
  }, [message.payload, isJson, parsedPayload, filteredPayload, showSelectedOnly]);

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
      className="group bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden shadow-sm hover:shadow-cyan-500/10 transition-all duration-300"
    >
      {/* Header */}
      <div 
        className="px-4 py-3 flex flex-col gap-2 cursor-pointer hover:bg-slate-700/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <span className="font-mono text-sm font-semibold text-slate-200 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {message.topic}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400 font-mono truncate max-w-[100px] sm:max-w-[200px]">
              {!expanded && (isJson ? '{...}' : message.payload.substring(0, 30) + (message.payload.length > 30 ? '...' : ''))}
            </div>
            <button className="text-slate-400 hover:text-cyan-400 transition-colors p-1 rounded-md hover:bg-slate-700/50">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-slate-500 font-mono">
          <span className="flex items-center gap-1 bg-slate-900/50 px-2 py-0.5 rounded-md border border-slate-700/50">
            <Activity className="w-3 h-3 text-cyan-500" /> QoS {message.qos}
          </span>
          
          <div className="flex items-center gap-1 bg-slate-900/50 px-2 py-0.5 rounded-md border border-slate-700/50 group/time">
            <Clock className="w-3 h-3 text-purple-400" />
            <span>{format(message.timestamp, 'yyyy-MM-dd HH:mm:ss.SSS')}</span>
            <button 
              onClick={(e) => handleCopy(format(message.timestamp, 'yyyy-MM-dd HH:mm:ss.SSS'), e)}
              className="ml-1 p-0.5 hover:text-cyan-400 transition-colors"
              title="Copy formatted time"
            >
              <Copy className="w-2.5 h-2.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/50 px-2 py-0.5 rounded-md border border-slate-700/50 group/ts">
            <Hash className="w-3 h-3 text-emerald-400" />
            <span>{message.timestamp}</span>
            <button 
              onClick={(e) => handleCopy(message.timestamp.toString(), e)}
              className="ml-1 p-0.5 hover:text-cyan-400 transition-colors"
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
            className="border-t border-slate-700/50"
          >
            <div className="p-4 bg-slate-900/30">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button
                  onClick={(e) => { e.stopPropagation(); setViewMode('formatted'); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    viewMode === 'formatted' 
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" 
                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                  )}
                >
                  <FileJson className="w-3.5 h-3.5" />
                  {isJson ? 'Formatted JSON' : 'Formatted'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setViewMode('raw'); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    viewMode === 'raw' 
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Raw
                </button>
                {message.previousPayload && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewMode('diff'); }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      viewMode === 'diff' 
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                        : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                    )}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Diff
                  </button>
                )}

                <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block"></div>

                {isJson && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowFieldPicker(!showFieldPicker); }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                        showFieldPicker ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                      )}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      Fields {selectedFields.length > 0 && `(${selectedFields.length})`}
                    </button>

                    <button
                      disabled={selectedFields.length === 0}
                      onClick={(e) => { e.stopPropagation(); setShowSelectedOnly(!showSelectedOnly); }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                        showSelectedOnly ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                      )}
                    >
                      {showSelectedOnly ? 'Show Full' : 'Show Selected'}
                    </button>
                  </>
                )}
              </div>

              {/* Field Picker */}
              <AnimatePresence>
                {showFieldPicker && isJson && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-3 bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Select Fields to Display</span>
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
                              : "bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600"
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
                  <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap overflow-x-auto p-4 rounded-md bg-slate-900/80 border border-slate-700/50 shadow-inner max-h-[400px] overflow-y-auto custom-scrollbar">
                    {viewMode === 'formatted' && isJson ? (
                      <code dangerouslySetInnerHTML={{ __html: syntaxHighlight(formattedPayload) }} />
                    ) : (
                      <code>{viewMode === 'formatted' ? formattedPayload : message.payload}</code>
                    )}
                  </pre>
                )}
                
                <button 
                  onClick={() => handleCopy(viewMode === 'formatted' ? formattedPayload : message.payload)}
                  className="absolute top-2 right-2 p-1.5 bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 rounded-md border border-slate-700/50 opacity-0 group-hover/copy:opacity-100 transition-all backdrop-blur-sm"
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
