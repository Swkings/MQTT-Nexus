import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, FileJson, FileText, Activity, Clock, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MqttMessage } from '../hooks/useMqtt';
import { DiffViewer, syntaxHighlight } from './DiffViewer';
import { cn } from '../lib/utils';

interface MessageCardProps {
  message: MqttMessage;
  showDiffByDefault?: boolean;
}

export function MessageCard({ message, showDiffByDefault = false }: MessageCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'raw' | 'formatted' | 'diff'>(
    message.previousPayload && showDiffByDefault ? 'diff' : 'formatted'
  );

  const isJson = useMemo(() => {
    try {
      JSON.parse(message.payload);
      return true;
    } catch {
      return false;
    }
  }, [message.payload]);

  const formattedPayload = useMemo(() => {
    if (!isJson) return message.payload;
    try {
      return JSON.stringify(JSON.parse(message.payload), null, 2);
    } catch {
      return message.payload;
    }
  }, [message.payload, isJson]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className="group bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden shadow-sm hover:shadow-cyan-500/10 transition-all duration-300"
    >
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <span className="font-mono text-sm font-semibold text-slate-200 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
            {message.topic}
          </span>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1 bg-slate-900/50 px-2 py-0.5 rounded-md border border-slate-700/50">
              <Activity className="w-3 h-3 text-cyan-500" /> QoS {message.qos}
            </span>
            <span className="flex items-center gap-1 bg-slate-900/50 px-2 py-0.5 rounded-md border border-slate-700/50">
              <Clock className="w-3 h-3 text-purple-400" /> {format(message.timestamp, 'HH:mm:ss.SSS')}
            </span>
          </div>
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
              <div className="flex items-center gap-2 mb-3">
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
              </div>

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
                  onClick={() => navigator.clipboard.writeText(message.payload)}
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
