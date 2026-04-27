import React, { useState, useEffect, useRef } from 'react';
import { X, Server, User, Key, Globe, Link2, Library, BookmarkPlus } from 'lucide-react';
import { BrokerConfig, SavedHost, SavedCredential } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import { MQTTClientPrefix } from '../etc/config';

interface BrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (broker: BrokerConfig | Omit<BrokerConfig, 'id'>) => void;
  initialData?: BrokerConfig | null;
  savedHosts: SavedHost[];
  onSaveHost: (host: SavedHost) => void;
  onDeleteHost: (id: string) => void;
  savedCredentials: SavedCredential[];
  onSaveCredential: (cred: SavedCredential) => void;
  onDeleteCredential: (id: string) => void;
}

export function BrokerModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData,
  savedHosts,
  onSaveHost,
  onDeleteHost,
  savedCredentials,
  onSaveCredential,
  onDeleteCredential
}: BrokerModalProps) {
  const { theme, themeClasses } = useTheme();

  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState('ws');
  const [host, setHost] = useState('broker.emqx.io');
  const [port, setPort] = useState<number | ''>(8083);
  const [path, setPath] = useState('/mqtt');
  const [clientId, setClientId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Library UI states
  const [showHostLib, setShowHostLib] = useState(false);
  const [hostLibPosition, setHostLibPosition] = useState({ top: '100%', right: '0' });
  const [savingHost, setSavingHost] = useState(false);
  const [hostAlias, setHostAlias] = useState('');

  const [showCredLib, setShowCredLib] = useState(false);
  const [credLibPosition, setCredLibPosition] = useState({ top: '100%', right: '0' });
  const [savingCred, setSavingCred] = useState(false);
  const [credAlias, setCredAlias] = useState('');

  // Error message state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Timer refs for hover delays and auto-dismiss
  const hostLibTimerRef = useRef<NodeJS.Timeout | null>(null);
  const credLibTimerRef = useRef<NodeJS.Timeout | null>(null);
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 处理 Library 按钮悬浮事件
  const handleHostLibMouseEnter = () => {
    // 清除之前的关闭定时器
    if (hostLibTimerRef.current) {
      clearTimeout(hostLibTimerRef.current);
      hostLibTimerRef.current = null;
    }
    setShowHostLib(true);
    if (!showHostLib) {
      setHostAlias(''); // 打开下拉框时清空别名输入
    }
  };

  const handleHostLibMouseLeave = () => {
    // 延迟关闭，给用户时间移动到下拉框上
    hostLibTimerRef.current = setTimeout(() => {
      setShowHostLib(false);
      hostLibTimerRef.current = null;
    }, 150);
  };

  // 设置错误消息自动消失
  useEffect(() => {
    if (errorMessage) {
      // 清除之前的定时器
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
      // 3 秒后自动消失
      errorTimerRef.current = setTimeout(() => {
        setErrorMessage(null);
        errorTimerRef.current = null;
      }, 3000);
    }
    
    // 清理函数：组件卸载或 errorMessage 变化时清除定时器
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    };
  }, [errorMessage]);

  // 保存 Host 到 Library
  const handleSaveHost = () => {
    if (hostAlias.trim() && host.trim()) {
      // 检查别名是否已存在
      const aliasExists = savedHosts.some(
        h => h.alias.toLowerCase() === hostAlias.trim().toLowerCase()
      );
      
      if (aliasExists) {
        setErrorMessage(`Host alias "${hostAlias.trim()}" already exists. Please use a different alias.`);
        return;
      }
      
      onSaveHost({ 
        id: Math.random().toString(36).substr(2, 9), 
        alias: hostAlias.trim(), 
        host: host.trim() 
      });
      setSavingHost(false);
      setHostAlias('');
      setShowHostLib(false);
      if (hostLibTimerRef.current) {
        clearTimeout(hostLibTimerRef.current);
        hostLibTimerRef.current = null;
      }
    }
  };

  // 保存到 Library 按钮的处理函数
  const handleSaveHostToLibrary = () => {
    if (hostAlias.trim() && host.trim()) {
      onSaveHost({ 
        id: Math.random().toString(36).substr(2, 9), 
        alias: hostAlias.trim(), 
        host: host.trim()
      });
      setSavingHost(false);
      setHostAlias('');
    }
  };


  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setProtocol(initialData.protocol || 'ws');
        setHost(initialData.host || '');
        setPort(initialData.port || 8083); // ✅ 使用用户设置的端口
        setPath(initialData.path || '/mqtt');
        setClientId(initialData.clientId);
        setUsername(initialData.username || '');
        setPassword(initialData.password || '');
      } else {
        setName('');
        setProtocol('mqtt');
        setHost('broker.emqx.io');
        setPath('/');
        setClientId(`${MQTTClientPrefix}${Math.random().toString(16).substr(2, 8)}`);
        setUsername('');
        setPassword('');
      }
      setShowHostLib(false);
      setSavingHost(false);
      setShowCredLib(false);
      setSavingCred(false);
      setErrorMessage(null); // 清除错误信息
      // 清除定时器
      if (hostLibTimerRef.current) {
        clearTimeout(hostLibTimerRef.current);
        hostLibTimerRef.current = null;
      }
      if (credLibTimerRef.current) {
        clearTimeout(credLibTimerRef.current);
        credLibTimerRef.current = null;
      }
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    } else {
      setErrorMessage(null); // 关闭时清除错误信息
    }
  }, [isOpen, initialData]);

  // 根据协议设置默认 path 和 port (仅在创建新 broker 时)
  useEffect(() => {
    // 只在创建新 broker 时自动设置默认端口和路径
    // 编辑现有 broker 时，保持用户已设置的值
    if (!initialData) {
      if (protocol === 'ws') {
        setPath('/mqtt');
        setPort(8083);
      } else if (protocol === 'wss') {
        setPath('/mqtt');
        setPort(8084);
      } else if (protocol === 'mqtt') {
        setPath('/');
        setPort(1883);
      } else if (protocol === 'mqtts') {
        setPath('/');
        setPort(8883);
      }
    }
  }, [protocol, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && host.trim() && port !== '') {
      const brokerData = {
        name: name.trim(),
        protocol,
        host: host.trim(),
        port: port,
        path: path.trim() || '/',
        clientId: clientId.trim() || `${MQTTClientPrefix}${Math.random().toString(16).substr(2, 8)}`,
        username: username.trim() || undefined,
        password: password || undefined,
      };
      
      if (initialData) {
        onSave({ ...brokerData, id: initialData.id });
      } else {
        onSave(brokerData);
      }
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Error Message Toast */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -50, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: -50, x: '-50%' }}
                className="fixed top-4 left-1/2 z-[99999] max-w-md w-full px-4"
              >
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border",
                  theme.mode === 'light' 
                    ? "bg-rose-50 border-rose-200 text-rose-800" 
                    : "bg-rose-900/90 border-rose-700 text-rose-100",
                  themeClasses.shadow
                )}>
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    theme.mode === 'light' ? "bg-rose-100" : "bg-rose-800"
                  )}>
                    <X className={cn(
                      "w-5 h-5",
                      theme.mode === 'light' ? "text-rose-600" : "text-rose-300"
                    )} />
                  </div>
                  <p className="flex-1 text-sm font-medium">{errorMessage}</p>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className={cn(
                      "flex-shrink-0 p-1 rounded-md transition-colors",
                      theme.mode === 'light' 
                        ? "text-rose-600 hover:bg-rose-100" 
                        : "text-rose-300 hover:bg-rose-800/50"
                    )}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={cn(
              "fixed inset-0 z-50",
              theme.mode === 'light'
                ? "bg-slate-950/40 backdrop-blur-sm"
                : "bg-slate-950/80 backdrop-blur-sm"
            )}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden",
              themeClasses.cardBg,
              themeClasses.border,
              themeClasses.shadow
            )}
          >
            <div className={cn(
              "flex items-center justify-between p-4 border-b",
              themeClasses.border,
              themeClasses.panelBg
            )}>
              <h2 className={cn("text-lg font-semibold flex items-center gap-2", themeClasses.textPrimary)}>
                <Server className={cn("w-5 h-5", theme.mode === 'light' ? "text-cyan-600" : "text-cyan-400")} />
                {initialData ? 'Edit Broker Connection' : 'Add Broker Connection'}
              </h2>
              <button
                onClick={onClose}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  themeClasses.textSecondary,
                  theme.mode === 'light' ? "hover:text-slate-700 hover:bg-slate-200" : "hover:text-slate-200 hover:bg-slate-700/50"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className={cn("text-xs font-medium uppercase tracking-wider", themeClasses.textSecondary)}>Connection Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(
                    "block w-full px-3 py-2 border rounded-lg leading-5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500",
                    theme.mode === 'light' ? "bg-slate-100 text-slate-800 placeholder-slate-500 border-slate-300" : "bg-slate-950/50 text-slate-300 placeholder-slate-500 border-slate-700",
                    themeClasses.border
                  )}
                  placeholder="My Production Broker"
                  required
                />
              </div>

              {/* Protocol 行 - 独占一行 */}
              <div className="space-y-1">
                <label className={cn("text-xs font-medium uppercase tracking-wider", themeClasses.textSecondary)}>Protocol</label>
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  className={cn(
                    "block w-full px-3 py-2 border rounded-lg leading-5 text-sm transition-colors appearance-none focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500",
                    theme.mode === 'light' ? "bg-slate-100 text-slate-800 border-slate-300" : "bg-slate-950/50 text-slate-300 border-slate-700"
                  )}
                >
                  <option value="mqtt">mqtt:// (TCP)</option>
                  <option value="mqtts">mqtts:// (TLS/SSL)</option>
                  <option value="ws">ws:// (WebSocket)</option>
                  <option value="wss">wss:// (Secure WebSocket)</option>
                </select>
              </div>

              {/* Host 和 Port 同一行 */}
              <div className="space-y-1">
                <label className={cn("text-xs font-medium uppercase tracking-wider", themeClasses.textSecondary)}>Host & Port</label>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-3 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Globe className={cn("h-4 w-4", theme.mode === 'light' ? "text-slate-400" : "text-slate-500")} />
                    </div>
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      className={cn(
                        "block w-full pl-10 pr-24 py-2 border rounded-lg leading-5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors",
                        theme.mode === 'light' ? "bg-slate-100 text-slate-800 placeholder-slate-500 border-slate-300" : "bg-slate-950/50 text-slate-300 placeholder-slate-500 border-slate-700"
                      )}
                      placeholder="broker.emqx.io"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                      <button 
                        type="button" 
                        onMouseEnter={handleHostLibMouseEnter}
                        onMouseLeave={handleHostLibMouseLeave}
                        className={cn("p-1.5 rounded-md transition-colors", theme.mode === 'light' ? "text-cyan-600 hover:bg-cyan-50" : "text-cyan-400 hover:bg-slate-800")}
                        title="Library"
                      >
                        <Library className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Library Dropdown */}
                    {showHostLib && (
                      <div 
                        className="absolute z-[9999] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto" 
                        style={{ top: '100%', left: 0, right: 0, marginTop: '4px' }}
                        onMouseEnter={handleHostLibMouseEnter}
                        onMouseLeave={handleHostLibMouseLeave}
                      >
                        {savedHosts.length === 0 ? (
                          <div className="p-4 text-center">
                            <p className={cn("text-sm", theme.mode === 'light' ? "text-slate-500" : "text-slate-400")}>No saved hosts</p>
                          </div>
                        ) : (
                          <div className="py-1">
                            {savedHosts.map((item, index) => (
                              <div
                                key={index}
                                className={cn(
                                  "group flex items-center justify-between px-4 py-2 transition-colors",
                                  theme.mode === 'light' ? "hover:bg-slate-100" : "hover:bg-slate-800"
                                )}
                              >
                                <div 
                                  className="flex-1 min-w-0 pr-2 cursor-pointer"
                                  onClick={() => {
                                    setHost(item.host);
                                    setShowHostLib(false);
                                    if (hostLibTimerRef.current) {
                                      clearTimeout(hostLibTimerRef.current);
                                      hostLibTimerRef.current = null;
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={cn("font-medium truncate", theme.mode === 'light' ? "text-slate-700" : "text-slate-300")}>{item.alias || item.host}</span>
                                    <span className={cn("text-xs ml-2 flex-shrink-0", theme.mode === 'light' ? "text-slate-500" : "text-slate-400")}>{item.host}</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteHost(item.id);
                                  }}
                                  className={cn(
                                    "p-1 rounded-md transition-all",
                                    theme.mode === 'light' 
                                      ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" 
                                      : "text-slate-500 hover:text-rose-400 hover:bg-slate-700/50"
                                  )}
                                  title="Delete"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Save Current 选项 - 带别名输入框 */}
                        <div className={cn("border-t p-3", theme.mode === 'light' ? "border-slate-200 bg-slate-50" : "border-slate-700 bg-slate-800")}>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={hostAlias}
                              onChange={(e) => setHostAlias(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveHost();
                                }
                              }}
                              className={cn(
                                "flex-1 px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors",
                                theme.mode === 'light' ? "bg-white text-slate-800 placeholder-slate-500 border-slate-300" : "bg-slate-900 text-slate-300 placeholder-slate-500 border-slate-700"
                              )}
                              placeholder="Alias (e.g., Production Broker)"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={handleSaveHost}
                              disabled={!hostAlias.trim() || !host.trim()}
                              className="px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="col-span-1">
                    <input
                      type="number"
                      value={port}
                      onChange={(e) => setPort(e.target.value ? Number(e.target.value) : '')}
                      className={cn(
                        "block w-full px-2 py-2 border rounded-lg leading-5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors",
                        theme.mode === 'light' ? "bg-slate-100 text-slate-800 placeholder-slate-500 border-slate-300" : "bg-slate-950/50 text-slate-300 placeholder-slate-500 border-slate-700"
                      )}
                      placeholder="1883"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className={cn("text-xs font-medium uppercase tracking-wider", theme.mode === 'light' ? "text-slate-600" : "text-slate-400")}>Path</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Link2 className={cn("h-4 w-4", theme.mode === 'light' ? "text-slate-500" : "text-slate-400")} />
                  </div>
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    className={cn(
                      "block w-full pl-10 pr-3 py-2 border rounded-lg leading-5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors",
                      theme.mode === 'light' ? "bg-slate-100 text-slate-800 placeholder-slate-500 border-slate-300" : "bg-slate-950/50 text-slate-300 placeholder-slate-500 border-slate-700"
                    )}
                    placeholder="/mqtt"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className={cn("text-xs font-medium uppercase tracking-wider", theme.mode === 'light' ? "text-slate-600" : "text-slate-400")}>Client ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className={cn("h-4 w-4", theme.mode === 'light' ? "text-slate-500" : "text-slate-400")} />
                  </div>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className={cn(
                      "block w-full pl-10 pr-3 py-2 border rounded-lg leading-5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors",
                      theme.mode === 'light' ? "bg-slate-100 text-slate-800 placeholder-slate-500 border-slate-300" : "bg-slate-950/50 text-slate-300 placeholder-slate-500 border-slate-700"
                    )}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t" style={{ borderColor: theme.mode === 'light' ? '#e2e8f0' : '#1e293b' }}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={cn("text-xs font-medium uppercase tracking-wider", theme.mode === 'light' ? "text-slate-600" : "text-slate-400")}>Authentication</label>
                    <div className="flex items-center gap-2 relative">
                      {/* Library 按钮 - 整合了 Library 和 Save Current 功能 */}
                      <button 
                        type="button" 
                        onMouseEnter={() => {
                          if (credLibTimerRef.current) {
                            clearTimeout(credLibTimerRef.current);
                            credLibTimerRef.current = null;
                          }
                          setShowCredLib(true);
                          setCredAlias(''); // 打开下拉框时清空别名输入
                        }}
                        onMouseLeave={() => {
                          credLibTimerRef.current = setTimeout(() => {
                            setShowCredLib(false);
                            credLibTimerRef.current = null;
                          }, 150);
                        }}
                        className={cn("p-1.5 rounded-md transition-colors", theme.mode === 'light' ? "text-cyan-600 hover:bg-cyan-50" : "text-cyan-400 hover:bg-slate-800")}
                        title="Credentials Library"
                      >
                        <Library className="w-4 h-4" />
                      </button>
                      
                      {/* Credentials Library Dropdown - 整合了选择和新增功能 */}
                      {showCredLib && (
                        <div 
                          className="absolute right-0 w-72 rounded-xl shadow-2xl z-[9999]" 
                          style={{ top: '100%', marginTop: '4px' }}
                          onMouseEnter={() => {
                            if (credLibTimerRef.current) {
                              clearTimeout(credLibTimerRef.current);
                              credLibTimerRef.current = null;
                            }
                            setShowCredLib(true);
                          }}
                          onMouseLeave={() => {
                            credLibTimerRef.current = setTimeout(() => {
                              setShowCredLib(false);
                              credLibTimerRef.current = null;
                            }, 150);
                          }}
                        >
                          <div className={cn("max-h-80 overflow-y-auto rounded-xl border", theme.mode === 'light' ? "bg-slate-100 border-slate-300" : "bg-slate-800 border-slate-700")}>
                            {/* 已有凭证列表 */}
                            {savedCredentials.length === 0 ? (
                              <div className={cn("px-4 py-3 text-xs text-center flex flex-col items-center gap-1", theme.mode === 'light' ? "text-slate-500" : "text-slate-400")}>
                                <Key className="w-6 h-6 opacity-50" />
                                <span>No saved credentials</span>
                              </div>
                            ) : (
                              <div className="py-1">
                                {savedCredentials.map(sc => (
                                  <div 
                                    key={sc.id} 
                                    className={cn("flex items-center justify-between px-3 py-2.5 cursor-pointer group transition-colors", theme.mode === 'light' ? "hover:bg-slate-200/70" : "hover:bg-slate-700/70")}
                                    onClick={() => { 
                                      setUsername(sc.username || ''); 
                                      setPassword(sc.password || ''); 
                                      setShowCredLib(false);
                                      if (credLibTimerRef.current) {
                                        clearTimeout(credLibTimerRef.current);
                                        credLibTimerRef.current = null;
                                      }
                                    }}
                                  >
                                    <div className="flex-1 min-w-0 pr-2">
                                      <div className={cn("text-sm font-medium truncate", theme.mode === 'light' ? "text-slate-800" : "text-slate-200")}>{sc.alias}</div>
                                      <div className={cn("text-xs truncate", theme.mode === 'light' ? "text-slate-500" : "text-slate-400")}>{sc.username || 'No username'}</div>
                                    </div>
                                    <button 
                                      type="button" 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        onDeleteCredential(sc.id); 
                                      }} 
                                      className={cn("text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 p-1.5 rounded-md transition-all", theme.mode === 'light' ? "hover:bg-slate-200" : "hover:bg-slate-700")}
                                      title="Delete"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* 分隔线 */}
                            <div className={cn("border-t", theme.mode === 'light' ? "border-slate-300" : "border-slate-700")}></div>
                            
                            {/* 保存当前凭证表单 */}
                            <div className={cn("p-3", theme.mode === 'light' ? "bg-slate-50" : "bg-slate-800")}>
                              <div className={cn("text-xs font-medium uppercase tracking-wider mb-2", theme.mode === 'light' ? "text-slate-500" : "text-slate-400")}>
                                Save Current Credentials
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Alias (e.g., Production)"
                                  value={credAlias}
                                  onChange={e => setCredAlias(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (credAlias.trim() && (username.trim() || password)) {
                                        onSaveCredential({ 
                                          id: Math.random().toString(36).substr(2, 9), 
                                          alias: credAlias.trim(), 
                                          username: username.trim(), 
                                          password 
                                        });
                                        setCredAlias('');
                                        setShowCredLib(false);
                                        if (credLibTimerRef.current) {
                                          clearTimeout(credLibTimerRef.current);
                                          credLibTimerRef.current = null;
                                        }
                                      }
                                    }
                                  }}
                                  className={cn(
                                    "flex-1 px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder-slate-600",
                                    theme.mode === 'light' ? "bg-white text-slate-800 border-slate-300" : "bg-slate-900 text-slate-200 border-slate-700"
                                  )}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (credAlias.trim() && (username.trim() || password)) {
                                      onSaveCredential({ 
                                        id: Math.random().toString(36).substr(2, 9), 
                                        alias: credAlias.trim(), 
                                        username: username.trim(), 
                                        password 
                                      });
                                      setCredAlias('');
                                      setShowCredLib(false);
                                      if (credLibTimerRef.current) {
                                        clearTimeout(credLibTimerRef.current);
                                        credLibTimerRef.current = null;
                                      }
                                    }
                                  }}
                                  disabled={!credAlias.trim() || (!username.trim() && !password)}
                                  className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20 whitespace-nowrap flex-shrink-0"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={cn("text-xs font-medium uppercase tracking-wider", theme.mode === 'light' ? "text-slate-600" : "text-slate-400")}>Username</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className={cn("h-4 w-4", theme.mode === 'light' ? "text-slate-500" : "text-slate-400")} />
                        </div>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className={cn(
                            "block w-full pl-10 pr-3 py-2 border rounded-lg leading-5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors",
                            theme.mode === 'light' ? "bg-slate-100 text-slate-800 placeholder-slate-500 border-slate-300" : "bg-slate-950/50 text-slate-300 placeholder-slate-500 border-slate-700"
                          )}
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Key className={cn("h-4 w-4", theme.mode === 'light' ? "text-slate-500" : "text-slate-400")} />
                        </div>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={cn(
                            "block w-full pl-10 pr-3 py-2 border rounded-lg leading-5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors",
                            theme.mode === 'light' ? "bg-slate-100 text-slate-800 placeholder-slate-500 border-slate-300" : "bg-slate-950/50 text-slate-300 placeholder-slate-500 border-slate-700"
                          )}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-colors", theme.mode === 'light' ? "text-slate-700 bg-slate-200 hover:bg-slate-300" : "text-slate-300 bg-slate-800 hover:bg-slate-700")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={cn("px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-lg", theme.mode === 'light' ? "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/30" : "bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/20")}
                >
                  {initialData ? 'Save Changes' : 'Add Broker'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
