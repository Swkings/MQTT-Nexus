import React, { useMemo } from 'react';
import { diffJson, diffLines, Change } from 'diff';
import { cn } from '../lib/utils';
import { Copy } from 'lucide-react';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  className?: string;
  viewMode?: 'inline' | 'latest' | 'split';
}

export function DiffViewer({ oldValue, newValue, className, viewMode = 'inline' }: DiffViewerProps) {
  const diffs = useMemo(() => {
    try {
      // Try parsing as JSON first
      const oldJson = JSON.parse(oldValue);
      const newJson = JSON.parse(newValue);
      return diffJson(oldJson, newJson);
    } catch (e) {
      // Fallback to line diff
      return diffLines(oldValue || '', newValue || '');
    }
  }, [oldValue, newValue]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (viewMode === 'latest') {
    const formatted = useMemo(() => {
      try {
        return JSON.stringify(JSON.parse(newValue), null, 2);
      } catch {
        return newValue;
      }
    }, [newValue]);

    return (
      <div className={cn("relative group font-mono text-xs whitespace-pre-wrap overflow-x-auto p-4 rounded-md bg-slate-900/50 border border-slate-700/50", className)}>
        <span className="text-slate-300">{formatted}</span>
        <button 
          onClick={() => handleCopy(newValue)}
          className="absolute top-2 right-2 p-1.5 bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 rounded-md border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
          title="Copy to clipboard"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (viewMode === 'split') {
    return (
      <div className={cn("grid grid-cols-2 gap-4", className)}>
        <div className="relative group font-mono text-xs whitespace-pre-wrap overflow-x-auto p-4 rounded-md bg-slate-900/50 border border-slate-700/50">
          <div className="text-xs text-slate-500 mb-2 font-sans font-medium border-b border-slate-700/50 pb-2">Previous</div>
          {diffs.filter(part => !part.added).map((part, index) => {
            const color = part.removed
              ? 'text-rose-400 bg-rose-400/10'
              : 'text-slate-400';
            return (
              <span key={index} className={cn("inline-block", color)}>
                {part.value}
              </span>
            );
          })}
          <button 
            onClick={() => handleCopy(oldValue)}
            className="absolute top-2 right-2 p-1.5 bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 rounded-md border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
            title="Copy old value"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="relative group font-mono text-xs whitespace-pre-wrap overflow-x-auto p-4 rounded-md bg-slate-900/50 border border-slate-700/50">
          <div className="text-xs text-slate-500 mb-2 font-sans font-medium border-b border-slate-700/50 pb-2">Latest</div>
          {diffs.filter(part => !part.removed).map((part, index) => {
            const color = part.added
              ? 'text-emerald-400 bg-emerald-400/10'
              : 'text-slate-300';
            return (
              <span key={index} className={cn("inline-block", color)}>
                {part.value}
              </span>
            );
          })}
          <button 
            onClick={() => handleCopy(newValue)}
            className="absolute top-2 right-2 p-1.5 bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 rounded-md border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
            title="Copy new value"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative group font-mono text-xs whitespace-pre-wrap overflow-x-auto p-4 rounded-md bg-slate-900/50 border border-slate-700/50", className)}>
      {diffs.map((part, index) => {
        const color = part.added
          ? 'text-emerald-400 bg-emerald-400/10'
          : part.removed
          ? 'text-rose-400 bg-rose-400/10 line-through opacity-70'
          : 'text-slate-300';
        
        return (
          <span key={index} className={cn("inline-block", color)}>
            {part.value}
          </span>
        );
      })}
      <button 
        onClick={() => handleCopy(newValue)}
        className="absolute top-2 right-2 p-1.5 bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 rounded-md border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
        title="Copy new value"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
