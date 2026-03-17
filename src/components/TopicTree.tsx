import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Hash, Search } from 'lucide-react';
import { cn } from '../lib/utils';

interface TreeNode {
  name: string;
  fullPath: string;
  children: Record<string, TreeNode>;
  messageCount: number;
  isLeaf: boolean;
}

function buildTree(topics: string[], counts: Record<string, number>): TreeNode {
  const root: TreeNode = { name: 'root', fullPath: '', children: {}, messageCount: 0, isLeaf: false };

  topics.forEach(topic => {
    const parts = topic.split('/');
    let current = root;
    let path = '';

    parts.forEach((part, index) => {
      path = index === 0 ? part : `${path}/${part}`;
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          fullPath: path,
          children: {},
          messageCount: 0,
          isLeaf: false
        };
      }
      current = current.children[part];
    });
    current.isLeaf = true;
    current.messageCount = counts[topic] || 0;
  });

  return root;
}

const TreeNodeView = ({ 
  node, 
  selectedTopic, 
  onSelectTopic, 
  level = 0,
  isSearching = false
}: { 
  node: TreeNode, 
  selectedTopic: string | null, 
  onSelectTopic: (t: string) => void, 
  level?: number,
  isSearching?: boolean
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = Object.keys(node.children).length > 0;
  const isSelected = selectedTopic === node.fullPath;

  useEffect(() => {
    if (isSearching) {
      setExpanded(true);
    }
  }, [isSearching]);

  return (
    <div className="select-none">
      <div 
        className={cn(
          "flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer hover:bg-slate-800/50 transition-colors",
          isSelected && "bg-cyan-500/20 text-cyan-300"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (node.messageCount > 0) {
            onSelectTopic(node.fullPath);
          } else if (hasChildren) {
            setExpanded(!expanded);
          }
        }}
      >
        <div 
          className="w-4 h-4 flex items-center justify-center cursor-pointer shrink-0"
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              setExpanded(!expanded);
            }
          }}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          ) : <span className="w-3.5 h-3.5" />}
        </div>
        
        {hasChildren ? (
          expanded ? <FolderOpen className="w-4 h-4 text-purple-400 shrink-0" /> : <Folder className="w-4 h-4 text-purple-400 shrink-0" />
        ) : (
          <Hash className="w-4 h-4 text-cyan-400 shrink-0" />
        )}
        
        <span className={cn("text-sm truncate", isSelected ? "font-medium text-cyan-300" : "text-slate-300")}>
          {node.name === '' ? (level === 0 ? '/' : '(empty)') : node.name}
        </span>
        
        {node.messageCount > 0 && (
          <span className="ml-auto text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-400 shrink-0">
            {node.messageCount}
          </span>
        )}
      </div>
      
      {expanded && hasChildren && (
        <div>
          {Object.values(node.children)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(child => (
            <TreeNodeView 
              key={child.fullPath} 
              node={child} 
              selectedTopic={selectedTopic} 
              onSelectTopic={onSelectTopic} 
              level={level + 1} 
              isSearching={isSearching}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface TopicTreeProps {
  topics: string[];
  messageCounts: Record<string, number>;
  selectedTopic: string | null;
  onSelectTopic: (topic: string) => void;
}

export function TopicTree({ topics, messageCounts, selectedTopic, onSelectTopic }: TopicTreeProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return topics;
    const lowerQuery = searchQuery.toLowerCase();
    return topics.filter(t => t.toLowerCase().includes(lowerQuery));
  }, [topics, searchQuery]);

  const tree = useMemo(() => buildTree(filteredTopics, messageCounts), [filteredTopics, messageCounts]);

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl shadow-black/50">
      <div className="p-4 border-b border-slate-700/50 bg-slate-900/20 shrink-0 space-y-3">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Folder className="w-4 h-4 text-purple-400" />
          Topic Tree
        </h2>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter topics..."
            className="block w-full pl-8 pr-3 py-1.5 border border-slate-700 rounded-md leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-xs transition-colors"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {Object.keys(tree.children).length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-8">
            {searchQuery ? 'No matching topics' : 'No topics yet'}
          </div>
        ) : (
          Object.values(tree.children)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(child => (
            <TreeNodeView 
              key={child.fullPath} 
              node={child} 
              selectedTopic={selectedTopic} 
              onSelectTopic={onSelectTopic} 
              isSearching={!!searchQuery}
            />
          ))
        )}
      </div>
    </div>
  );
}
