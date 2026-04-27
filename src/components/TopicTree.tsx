import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Hash, Search, PanelRightClose, PanelRightOpen, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';

interface TreeNode {
  name: string;
  fullPath: string;
  children: Record<string, TreeNode>;
  messageCount: number;
  topicCount: number;
  isLeaf: boolean;
  hasChildren: boolean;
}

function buildTree(topics: string[], counts: Record<string, number>): TreeNode {
  const root: TreeNode = { name: 'root', fullPath: '', children: {}, messageCount: 0, topicCount: 0, isLeaf: false, hasChildren: false };

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
          topicCount: 0,
          isLeaf: false,
          hasChildren: false
        };
      }
      current = current.children[part];
    });
    current.isLeaf = true;
    current.messageCount = counts[topic] || 0;
    current.topicCount = 1; // Leaf node has 1 topic
  });

  // Calculate topic counts for parent nodes
  const calculateTopicCounts = (node: TreeNode): number => {
    if (node.isLeaf) {
      return node.topicCount;
    }
    
    let totalTopics = 0;
    const childrenKeys = Object.keys(node.children);
    node.hasChildren = childrenKeys.length > 0;
    
    Object.values(node.children).forEach(child => {
      totalTopics += calculateTopicCounts(child);
    });
    node.topicCount = totalTopics;
    return totalTopics;
  };

  calculateTopicCounts(root);

  return root;
}

const TreeNodeView = ({ 
  node, 
  selectedTopic, 
  onSelectTopic, 
  onAddToFavorites,
  level = 0,
  isSearching = false,
  autoExpand = false,
  expandedState,
  setExpandedState
}: { 
  node: TreeNode, 
  selectedTopic: string | null, 
  onSelectTopic: (t: string) => void,
  onAddToFavorites: (topic: string, isWildcard: boolean) => void,
  level?: number,
  isSearching?: boolean,
  autoExpand?: boolean,
  expandedState?: Map<string, boolean>,
  setExpandedState?: (state: Map<string, boolean>) => void
}) => {
  const { theme, themeClasses } = useTheme();
  const nodeKey = node.fullPath || 'root';
  const [localExpanded, setLocalExpanded] = useState(autoExpand);
  const hasChildren = node.hasChildren;
  const isSelected = selectedTopic === node.fullPath;

  // 使用全局状态或本地状态
  const isExpanded = expandedState && setExpandedState 
    ? (expandedState.get(nodeKey) || false)
    : localExpanded;

  const setExpanded = (value: boolean) => {
    if (expandedState && setExpandedState) {
      const newState = new Map(expandedState);
      newState.set(nodeKey, value);
      setExpandedState(newState);
    } else {
      setLocalExpanded(value);
    }
  };

  useEffect(() => {
    if (isSearching) {
      setExpanded(true);
    }
  }, [isSearching]);

  useEffect(() => {
    if (autoExpand) {
      setExpanded(true);
    }
  }, [autoExpand]);

  // Determine display count and label
  const displayCount = node.isLeaf ? node.messageCount : node.topicCount;
  const countLabel = node.isLeaf ? 'msgs' : 'topics';

  return (
    <div className="select-none">
      <div 
        className={cn(
          "flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors group",
          theme.overlay === 'transparent' ? "hover:bg-slate-800/30" : theme.mode === 'light' ? "hover:bg-slate-200" : "hover:bg-slate-800/50",
          isSelected 
            ? "bg-cyan-500/20 text-cyan-400"
            : themeClasses.textPrimary
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (node.messageCount > 0) {
            onSelectTopic(node.fullPath);
          } else if (hasChildren) {
            setExpanded(!isExpanded);
          }
        }}
      >
        <div 
          className="w-4 h-4 flex items-center justify-center cursor-pointer shrink-0"
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              setExpanded(!isExpanded);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className={cn("w-3.5 h-3.5", themeClasses.textSecondary)} /> : <ChevronRight className={cn("w-3.5 h-3.5", themeClasses.textSecondary)} />
          ) : <span className="w-3.5 h-3.5" />}
        </div>
        
        {hasChildren ? (
          isExpanded ? <FolderOpen className={cn("w-4 h-4 shrink-0", theme.mode === 'light' ? "text-purple-600" : "text-purple-400")} /> : <Folder className={cn("w-4 h-4 shrink-0", theme.mode === 'light' ? "text-purple-600" : "text-purple-400")} />
        ) : (
          <Hash className={cn("w-4 h-4 shrink-0", theme.mode === 'light' ? "text-cyan-600" : "text-cyan-400")} />
        )}
        
        <span className={cn(
          "text-sm truncate", 
          isSelected ? "font-medium text-cyan-400" : themeClasses.textPrimary
        )}>
          {node.name === '' ? (level === 0 ? '/' : '(empty)') : node.name}
        </span>

        {/* Add to favorites button - for all nodes with topics */}
        {displayCount > 0 && onAddToFavorites && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // For non-leaf nodes, use wildcard subscription
              const isWildcard = !node.isLeaf && hasChildren;
              onAddToFavorites(node.fullPath, isWildcard);
            }}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-cyan-500/20",
              theme.overlay === 'transparent' && theme.mode === 'light'
                ? "text-slate-500 hover:text-cyan-600"
                : theme.mode === 'light'
                  ? "text-slate-400 hover:text-cyan-600"
                  : "text-slate-500 hover:text-cyan-400"
            )}
            title={node.isLeaf ? "Add to favorites" : "Add all sub-topics to favorites"}
          >
            <Star className="w-3 h-3" />
          </button>
        )}
        
        {/* Count display */}
        {displayCount > 0 && (
          <div className={cn(
            "ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1",
            theme.overlay === 'transparent'
              ? "bg-slate-800/50 text-slate-300"
              : theme.mode === 'light' 
                ? "bg-slate-200 text-slate-700" 
                : "bg-slate-800 text-slate-300"
          )}>
            <span>{displayCount}</span>
          </div>
        )}
      </div>
      
      {isExpanded && hasChildren && (
        <div>
          {Object.values(node.children)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(child => (
            <TreeNodeView 
              key={child.fullPath} 
              node={child} 
              selectedTopic={selectedTopic} 
              onSelectTopic={onSelectTopic}
              onAddToFavorites={onAddToFavorites}
              level={level + 1} 
              isSearching={isSearching}
              autoExpand={autoExpand}
              expandedState={expandedState}
              setExpandedState={setExpandedState}
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
  onAddToFavorites?: (topic: string, isWildcard: boolean) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  autoExpand?: boolean;
}

export function TopicTree({ 
  topics, 
  messageCounts, 
  selectedTopic, 
  onSelectTopic,
  onAddToFavorites,
  isCollapsed = false,
  onToggleCollapse,
  autoExpand = false,
}: TopicTreeProps) {
  const { theme, themeClasses } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedState, setExpandedState] = useState<Map<string, boolean>>(new Map());

  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return topics;
    const lowerQuery = searchQuery.toLowerCase();
    return topics.filter(t => t.toLowerCase().includes(lowerQuery));
  }, [topics, searchQuery]);

  const tree = useMemo(() => buildTree(filteredTopics, messageCounts), [filteredTopics, messageCounts]);

  return (
    <div className={cn(
      "backdrop-blur-xl border rounded-2xl flex flex-col h-full overflow-hidden transition-all duration-300",
      theme.overlay === 'transparent' ? 'bg-transparent' : themeClasses.cardBg,
      themeClasses.border,
      themeClasses.shadow,
      isCollapsed && "opacity-50"
    )}>
      <div className={cn(
        "p-4 border-b shrink-0 space-y-3",
        themeClasses.border,
        themeClasses.panelBg
      )}>
        <div className="flex items-center justify-between">
          <h2 className={cn("text-sm font-semibold flex items-center gap-2", themeClasses.textPrimary)}>
            <Folder className="w-4 h-4 text-purple-400" />
            Topic Tree
          </h2>
          <div className="flex items-center gap-1">
            {/* 一键展开/折叠按钮 */}
            <button
              onClick={() => {
                const allKeys = Object.keys(tree.children).reduce((keys, key) => {
                  const collectKeys = (node: TreeNode) => {
                    if (node.hasChildren) {
                      keys.push(node.fullPath);
                      Object.values(node.children).forEach(collectKeys);
                    }
                  };
                  collectKeys(tree.children[key]);
                  return keys;
                }, [] as string[]);
                
                const allExpanded = allKeys.every(key => expandedState.get(key));
                const newState = new Map<string, boolean>();
                allKeys.forEach(key => newState.set(key, !allExpanded));
                setExpandedState(newState);
              }}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                themeClasses.textSecondary,
                "hover:text-cyan-400 hover:bg-cyan-500/10"
              )}
              title="Expand/Collapse All"
            >
              {Object.keys(tree.children).some(key => {
                const hasAnyExpanded = (node: TreeNode): boolean => {
                  if (!node.hasChildren) return false;
                  if (expandedState.get(node.fullPath)) return true;
                  return Object.values(node.children).some(hasAnyExpanded);
                };
                return hasAnyExpanded(tree.children[key]);
              }) 
                ? <ChevronDown className="w-4 h-4" /> 
                : <ChevronRight className="w-4 h-4" />
              }
            </button>
            
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  themeClasses.textSecondary,
                  "hover:text-purple-400 hover:bg-purple-500/10"
                )}
                title={isCollapsed ? "Expand Topic Tree" : "Collapse Topic Tree"}
              >
                {isCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Search className={cn("h-3.5 w-3.5", themeClasses.textSecondary)} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter topics..."
            className={cn(
              "block w-full pl-8 pr-3 py-1.5 border rounded-md leading-5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500",
              theme.overlay === 'transparent'
                ? theme.mode === 'light'
                  ? "bg-white/50 placeholder-slate-400 text-slate-900 border-slate-300"
                  : "bg-slate-800/50 placeholder-slate-500 text-slate-100 border-slate-600"
                : theme.mode === 'light' 
                  ? "bg-white placeholder-slate-400 text-slate-900 border-slate-300" 
                  : "bg-slate-800 placeholder-slate-500 text-slate-100 border-slate-600"
            )}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {Object.keys(tree.children).length === 0 ? (
          <div className={cn("text-center text-xs py-8", themeClasses.textSecondary)}>
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
              onAddToFavorites={onAddToFavorites}
              isSearching={!!searchQuery}
              autoExpand={autoExpand}
              expandedState={expandedState}
              setExpandedState={setExpandedState}
            />
          ))
        )}
      </div>
    </div>
  );
}
