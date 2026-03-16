import React, { useMemo } from 'react';
import { diffJson, diffLines, Change } from 'diff';
import { cn } from '../lib/utils';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  className?: string;
}

export function DiffViewer({ oldValue, newValue, className }: DiffViewerProps) {
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

  return (
    <div className={cn("font-mono text-xs whitespace-pre-wrap overflow-x-auto p-4 rounded-md bg-slate-900/50 border border-slate-700/50", className)}>
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
    </div>
  );
}
