import React, { useMemo } from 'react';
import { diffJson, diffLines, Change } from 'diff';
import { cn } from '../lib/utils';
import { Copy, LineChart as LineChartIcon } from 'lucide-react';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  className?: string;
  viewMode?: 'inline' | 'latest' | 'split';
  onChartClick?: (path: string) => void;
  activeChartPath?: string | null;
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

export function getLinePaths(jsonString: string): string[] {
  const lines = jsonString.split('\n');
  const paths: string[] = new Array(lines.length).fill('');
  const stack: { key: string, depth: number }[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    const depth = Math.floor(indent / 2);
    
    const keyMatch = line.match(/^\s*"([^"]+)"\s*:/);
    if (keyMatch) {
      const key = keyMatch[1];
      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
        stack.pop();
      }
      stack.push({ key, depth });
      paths[i] = stack.map(s => s.key).join('.');
    }
  }
  return paths;
}

export function DiffViewer({ oldValue, newValue, className, viewMode = 'inline', onChartClick, activeChartPath }: DiffViewerProps) {
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

  const { formattedOld, formattedLatest } = useMemo(() => {
    let oldStr = '';
    let newStr = '';
    diffs.forEach(part => {
      if (!part.added) oldStr += part.value;
      if (!part.removed) newStr += part.value;
    });
    // Remove trailing newline if present to match split behavior
    if (oldStr.endsWith('\n')) oldStr = oldStr.slice(0, -1);
    if (newStr.endsWith('\n')) newStr = newStr.slice(0, -1);
    return { formattedOld: oldStr, formattedLatest: newStr };
  }, [diffs]);

  const handleCopy = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      navigator.clipboard.writeText(JSON.stringify(parsed, null, 2));
    } catch {
      navigator.clipboard.writeText(text);
    }
  };

  const newPaths = useMemo(() => getLinePaths(formattedLatest), [formattedLatest]);
  const oldPaths = useMemo(() => getLinePaths(formattedOld), [formattedOld]);

  if (viewMode === 'latest') {
    return (
      <div className={cn("relative group font-mono text-xs flex flex-col rounded-md bg-slate-900/50 border border-slate-700/50 overflow-hidden", className)}>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all z-10">
          <button 
            onClick={() => handleCopy(newValue)}
            className="p-1.5 bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 rounded-md border border-slate-700/50 backdrop-blur-sm shadow-lg"
            title="Copy formatted JSON"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar p-2 whitespace-pre-wrap">
          {formattedLatest.split('\n').map((line, i) => {
            const path = newPaths[i];
            const isActive = activeChartPath === path;
            return (
              <div key={i} className={cn("px-2 py-0.5 whitespace-pre flex items-center hover:bg-slate-800/50 transition-colors", isActive && "bg-cyan-900/30")}>
                {path && onChartClick && (
                  <button 
                    onClick={() => onChartClick(path)}
                    className={cn(
                      "mr-2 transition-colors",
                      isActive ? "text-cyan-400" : "text-slate-500 hover:text-cyan-400"
                    )}
                    title={`Monitor ${path}`}
                  >
                    <LineChartIcon className="w-3.5 h-3.5" />
                  </button>
                )}
                {!path && onChartClick && <div className="w-3.5 h-3.5 mr-2 shrink-0" />}
                <span dangerouslySetInnerHTML={{ __html: syntaxHighlight(line) }} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (viewMode === 'split') {
    let oldLineIdx = 0;
    let newLineIdx = 0;

    return (
      <div className={cn("relative group font-mono text-xs overflow-hidden rounded-md bg-slate-900/50 border border-slate-700/50 flex flex-col", className)}>
        <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 font-sans font-medium border-b border-slate-700/50 p-2 shrink-0 bg-slate-800/50">
          <div className="flex justify-between items-center px-2">
            <span>Previous</span>
            <button 
              onClick={() => handleCopy(oldValue)}
              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition-colors"
              title="Copy formatted JSON"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex justify-between items-center px-2">
            <span>Latest</span>
            <button 
              onClick={() => handleCopy(newValue)}
              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition-colors"
              title="Copy formatted JSON"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
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

                return lines.map((line, i) => {
                  const path = oldPaths[oldLineIdx++];
                  const isActive = activeChartPath === path;
                  return (
                    <div key={`${index}-${i}`} className={cn(
                      "px-2 py-0.5 whitespace-pre min-h-[20px] flex items-center",
                      part.removed ? "bg-rose-500/20 text-rose-300" : "text-slate-300",
                      isActive && !part.removed && "bg-cyan-900/30"
                    )}>
                      {path && onChartClick && (
                        <button 
                          onClick={() => onChartClick(path)}
                          className={cn(
                            "mr-2 transition-colors",
                            isActive ? "text-cyan-400" : "text-slate-500 hover:text-cyan-400"
                          )}
                          title={`Monitor ${path}`}
                        >
                          <LineChartIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!path && onChartClick && <div className="w-3.5 h-3.5 mr-2 shrink-0" />}
                      <span dangerouslySetInnerHTML={{ __html: syntaxHighlight(line) }} />
                    </div>
                  );
                });
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

                return lines.map((line, i) => {
                  const path = newPaths[newLineIdx++];
                  const isActive = activeChartPath === path;
                  return (
                    <div key={`${index}-${i}`} className={cn(
                      "px-2 py-0.5 whitespace-pre min-h-[20px] flex items-center",
                      part.added ? "bg-emerald-500/20 text-emerald-300" : "text-slate-300",
                      isActive && !part.added && "bg-cyan-900/30"
                    )}>
                      {path && onChartClick && (
                        <button 
                          onClick={() => onChartClick(path)}
                          className={cn(
                            "mr-2 transition-colors",
                            isActive ? "text-cyan-400" : "text-slate-500 hover:text-cyan-400"
                          )}
                          title={`Monitor ${path}`}
                        >
                          <LineChartIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!path && onChartClick && <div className="w-3.5 h-3.5 mr-2 shrink-0" />}
                      <span dangerouslySetInnerHTML={{ __html: syntaxHighlight(line) }} />
                    </div>
                  );
                });
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inline view
  let oldLineIdx = 0;
  let newLineIdx = 0;

  return (
    <div className={cn("relative group font-mono text-xs flex flex-col rounded-md bg-slate-900/50 border border-slate-700/50 overflow-hidden", className)}>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all z-10">
        <button 
          onClick={() => handleCopy(newValue)}
          className="p-1.5 bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 rounded-md border border-slate-700/50 backdrop-blur-sm shadow-lg"
          title="Copy formatted JSON"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar py-2">
        <div className="min-w-max">
          {(() => {
            const rows: React.ReactNode[] = [];
            for (let i = 0; i < diffs.length; i++) {
              const part = diffs[i];
              const nextPart = diffs[i + 1];
              
              // Check if we have a removed followed by an added (a change)
              if (part.removed && nextPart && nextPart.added) {
                const removedLines = part.value.split('\n');
                if (removedLines[removedLines.length - 1] === '') removedLines.pop();
                
                const addedLines = nextPart.value.split('\n');
                if (addedLines[addedLines.length - 1] === '') addedLines.pop();
                
                const maxLines = Math.max(removedLines.length, addedLines.length);
                
                for (let j = 0; j < maxLines; j++) {
                  if (j < removedLines.length) {
                    const path = oldPaths[oldLineIdx++];
                    const isActive = activeChartPath === path;
                    rows.push(
                      <div key={`removed-${i}-${j}`} className={cn("flex px-2 py-0.5 bg-rose-500/20 transition-colors items-center", isActive && "bg-rose-500/30")}>
                        <div className="w-6 shrink-0 select-none text-right pr-2 mr-2 border-r border-slate-700/50 text-rose-500">-</div>
                        {path && onChartClick && (
                          <button 
                            onClick={() => onChartClick(path)}
                            className={cn(
                              "mr-2 transition-colors",
                              isActive ? "text-cyan-400" : "text-slate-500 hover:text-cyan-400"
                            )}
                            title={`Monitor ${path}`}
                          >
                            <LineChartIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!path && onChartClick && <div className="w-3.5 h-3.5 mr-2 shrink-0" />}
                        <div className="whitespace-pre flex-1" dangerouslySetInnerHTML={{ __html: syntaxHighlight(removedLines[j]) }} />
                      </div>
                    );
                  }
                  if (j < addedLines.length) {
                    const path = newPaths[newLineIdx++];
                    const isActive = activeChartPath === path;
                    rows.push(
                      <div key={`added-${i}-${j}`} className={cn("flex px-2 py-0.5 bg-emerald-500/20 transition-colors items-center", isActive && "bg-emerald-500/30")}>
                        <div className="w-6 shrink-0 select-none text-right pr-2 mr-2 border-r border-slate-700/50 text-emerald-500">+</div>
                        {path && onChartClick && (
                          <button 
                            onClick={() => onChartClick(path)}
                            className={cn(
                              "mr-2 transition-colors",
                              isActive ? "text-cyan-400" : "text-slate-500 hover:text-cyan-400"
                            )}
                            title={`Monitor ${path}`}
                          >
                            <LineChartIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!path && onChartClick && <div className="w-3.5 h-3.5 mr-2 shrink-0" />}
                        <div className="whitespace-pre flex-1" dangerouslySetInnerHTML={{ __html: syntaxHighlight(addedLines[j]) }} />
                      </div>
                    );
                  }
                }
                i++; // Skip the next part since we handled it
              } else {
                // Normal rendering for unchanged, or isolated added/removed
                const lines = part.value.split('\n');
                if (lines[lines.length - 1] === '') lines.pop();
                
                lines.forEach((line, j) => {
                  const isAdded = part.added;
                  const isRemoved = part.removed;
                  
                  const path = isAdded ? newPaths[newLineIdx++] : (isRemoved ? oldPaths[oldLineIdx++] : newPaths[newLineIdx++]);
                  if (!isAdded && !isRemoved) oldLineIdx++; // Increment oldLineIdx for unchanged lines too
                  
                  const isActive = activeChartPath === path;
                  
                  rows.push(
                    <div key={`${i}-${j}`} className={cn(
                      "flex px-2 py-0.5 hover:bg-slate-800/50 transition-colors items-center",
                      isAdded ? "bg-emerald-500/20" :
                      isRemoved ? "bg-rose-500/20" : "",
                      isActive && !isAdded && !isRemoved && "bg-cyan-900/30"
                    )}>
                      <div className={cn(
                        "w-6 shrink-0 select-none text-right pr-2 mr-2 border-r border-slate-700/50",
                        isAdded ? "text-emerald-500" :
                        isRemoved ? "text-rose-500" : "text-slate-600"
                      )}>
                        {isAdded ? '+' : isRemoved ? '-' : ' '}
                      </div>
                      {path && onChartClick && (
                        <button 
                          onClick={() => onChartClick(path)}
                          className={cn(
                            "mr-2 transition-colors",
                            isActive ? "text-cyan-400" : "text-slate-500 hover:text-cyan-400"
                          )}
                          title={`Monitor ${path}`}
                        >
                          <LineChartIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!path && onChartClick && <div className="w-3.5 h-3.5 mr-2 shrink-0" />}
                      <div className="whitespace-pre flex-1" dangerouslySetInnerHTML={{ __html: syntaxHighlight(line) }} />
                    </div>
                  );
                });
              }
            }
            return rows;
          })()}
        </div>
      </div>
    </div>
  );
}
