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

export function syntaxHighlight(json: string) {
  if (!json) return '';
  let escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    let cls = 'text-blue-400'; // number
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-emerald-400'; // key
      } else {
        cls = 'text-amber-300'; // string
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-purple-400'; // boolean
    } else if (/null/.test(match)) {
      cls = 'text-slate-500'; // null
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
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
        <div dangerouslySetInnerHTML={{ __html: syntaxHighlight(formatted) }} />
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
      <div className={cn("relative group font-mono text-xs overflow-hidden rounded-md bg-slate-900/50 border border-slate-700/50 flex flex-col", className)}>
        <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 font-sans font-medium border-b border-slate-700/50 p-2 shrink-0 bg-slate-800/50">
          <div>Previous</div>
          <div>Latest</div>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar p-2">
          <div className="grid grid-cols-2 gap-4 min-w-max">
            <div>
              {diffs.map((part, index) => {
                const lines = part.value.split('\n');
                if (lines[lines.length - 1] === '') lines.pop();
                
                if (part.added) {
                  return lines.map((_, i) => (
                    <div key={`empty-added-${index}-${i}`} className="px-2 py-0.5 whitespace-pre min-h-[20px]">
                      {' '}
                    </div>
                  ));
                }

                return lines.map((line, i) => (
                  <div key={`${index}-${i}`} className={cn(
                    "px-2 py-0.5 whitespace-pre min-h-[20px]",
                    part.removed ? "bg-rose-500/20 text-rose-300" : "text-slate-300"
                  )}>
                    <span dangerouslySetInnerHTML={{ __html: syntaxHighlight(line) }} />
                  </div>
                ));
              })}
            </div>
            <div>
              {diffs.map((part, index) => {
                const lines = part.value.split('\n');
                if (lines[lines.length - 1] === '') lines.pop();
                
                if (part.removed) {
                  return lines.map((_, i) => (
                    <div key={`empty-removed-${index}-${i}`} className="px-2 py-0.5 whitespace-pre min-h-[20px]">
                      {' '}
                    </div>
                  ));
                }

                return lines.map((line, i) => (
                  <div key={`${index}-${i}`} className={cn(
                    "px-2 py-0.5 whitespace-pre min-h-[20px]",
                    part.added ? "bg-emerald-500/20 text-emerald-300" : "text-slate-300"
                  )}>
                    <span dangerouslySetInnerHTML={{ __html: syntaxHighlight(line) }} />
                  </div>
                ));
              })}
            </div>
          </div>
        </div>
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button 
            onClick={() => handleCopy(oldValue)}
            className="p-1.5 bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 rounded-md border border-slate-700/50 backdrop-blur-sm"
            title="Copy old value"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => handleCopy(newValue)}
            className="p-1.5 bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 rounded-md border border-slate-700/50 backdrop-blur-sm"
            title="Copy new value"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Inline view
  return (
    <div className={cn("relative group font-mono text-xs overflow-x-auto rounded-md bg-slate-900/50 border border-slate-700/50", className)}>
      <div className="py-2 min-w-max">
        {diffs.map((part, index) => {
          const lines = part.value.split('\n');
          if (lines[lines.length - 1] === '') lines.pop();
          
          return lines.map((line, i) => {
            const isAdded = part.added;
            const isRemoved = part.removed;
            
            return (
              <div key={`${index}-${i}`} className={cn(
                "flex px-2 py-0.5 hover:bg-slate-800/50 transition-colors",
                isAdded ? "bg-emerald-500/20" :
                isRemoved ? "bg-rose-500/20" : ""
              )}>
                <div className={cn(
                  "w-6 shrink-0 select-none text-right pr-2 mr-2 border-r border-slate-700/50",
                  isAdded ? "text-emerald-500" :
                  isRemoved ? "text-rose-500" : "text-slate-600"
                )}>
                  {isAdded ? '+' : isRemoved ? '-' : ' '}
                </div>
                <div className="whitespace-pre flex-1" dangerouslySetInnerHTML={{ __html: syntaxHighlight(line) }} />
              </div>
            );
          });
        })}
      </div>
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
