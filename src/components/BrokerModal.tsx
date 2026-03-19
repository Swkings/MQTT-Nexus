import React, { useState, useEffect } from 'react';
import { X, Server, User, Key, Globe, Link2, Library, BookmarkPlus } from 'lucide-react';
import { BrokerConfig, SavedHost, SavedCredential } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

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

  // 处理 Library 按钮点击 - 修复下拉菜单位置
  const handleHostLibClick = () => {
    // 使用事件委托和相对定位，不再需要直接获取元素位置
    setShowHostLib(!showHostLib);
  };

  // 保存 Host 到 Library
  const handleSaveHost = () => {
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

  // 根据协议自动设置默认端口
  const handleProtocolChange = (newProtocol: string) => {
    setProtocol(newProtocol);
    // 如果是首次设置或当前是默认端口，则自动更新端口
    if ((protocol === 'ws' && port === 8083) || 
        (protocol === 'wss' && port === 8084) ||
        (protocol === 'mqtt' && port === 1883) ||
        (protocol === 'mqtts' && port === 8883)) {
      switch (newProtocol) {
        case 'mqtt':
          setPort(1883);
          break;
        case 'mqtts':
          setPort(8883);
          break;
        case 'ws':
          setPort(8083);
          break;
        case 'wss':
          setPort(8084);
          break;
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setProtocol(initialData.protocol || 'ws');
        setHost(initialData.host || '');
        setPort(initialData.port || 8083);
        setPath(initialData.path || '/mqtt');
        setClientId(initialData.clientId);
        setUsername(initialData.username || '');
        setPassword(initialData.password || '');
      } else {
        setName('');
        setProtocol('mqtt');
        setHost('broker.emqx.io');
        setPort(1883);
        setPath('/mqtt');
        setClientId(`mqttjs_${Math.random().toString(16).substr(2, 8)}`);
        setUsername('');
        setPassword('');
      }
      setShowHostLib(false);
      setSavingHost(false);
      setShowCredLib(false);
      setSavingCred(false);
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && host.trim() && port !== '') {
      const brokerData = {
        name: name.trim(),
        protocol,
        host: host.trim(),
        port: Number(port),
        path: path.trim() || '/',
        clientId: clientId.trim() || `mqttjs_${Math.random().toString(16).substr(2, 8)}`,
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-400" />
                {initialData ? 'Edit Broker Connection' : 'Add Broker Connection'}
              </h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Connection Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-950/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-colors"
                  placeholder="My Production Broker"
                  required
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3 space-y-1">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Protocol</label>
                  <select
                    value={protocol}
                    onChange={(e) => handleProtocolChange(e.target.value)}
                    className="block w-full px-2 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-950/50 text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-colors appearance-none"
                  >
                    <option value="mqtt">mqtt:// (TCP)</option>
                    <option value="mqtts">mqtts:// (TLS/SSL)</option>
                    <option value="ws">ws:// (WebSocket)</option>
                    <option value="wss">wss:// (Secure WebSocket)</option>
                  </select>
                </div>

                <div className="col-span-6 space-y-1">
                  <div className="flex items-center justify-between relative">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Host</label>
                    <button 
                      type="button" 
                      onClick={handleHostLibClick} 
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    >
                      <Library className="w-3 h-3" /> Library
                    </button>
                  </div>
                  
                  {/* Host Library Dropdown - 修复定位和层级 */}
                  {showHostLib && (
                    <div className="relative w-full">
                      <div 
                        className="absolute top-full right-0 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-[9999] py-1.5 mt-1"
                      >
                        <div className="max-h-64 overflow-y-auto">
                          {savedHosts.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-slate-500 text-center flex flex-col items-center gap-1">
                              <Library className="w-6 h-6 opacity-50" />
                              <span>No saved hosts</span>
                              <span className="text-slate-600">Click bookmark icon to save</span>
                            </div>
                          ) : (
                            savedHosts.map(sh => (
                              <div 
                                key={sh.id} 
                                className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-700/70 cursor-pointer group transition-colors"
                                onClick={() => { 
                                  setHost(sh.host); 
                                  setShowHostLib(false); 
                                }}
                              >
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="text-sm text-slate-200 font-medium truncate">{sh.alias}</div>
                                  <div className="text-xs text-slate-500 truncate font-mono">{sh.host}</div>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onDeleteHost(sh.id); 
                                  }} 
                                  className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-slate-700 transition-all"
                                  title="Delete"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <Globe className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <input
                        type="text"
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                        className="block w-full pl-8 pr-2 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-950/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-colors"
                        placeholder="broker.emqx.io"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSavingHost(!savingHost); setHostAlias(''); }}
                      className={cn(
                        "p-2 rounded-lg transition-all border",
                        savingHost 
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-lg shadow-cyan-500/20" 
                          : "bg-slate-950/50 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50"
                      )}
                      title="Save to Library"
                    >
                      <BookmarkPlus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Save Host Form - 优化动画和样式 */}
                  {savingHost && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                      animate={{ opacity: 1, height: 'auto', marginTop: 8 }} 
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50"
                    >
                      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Save to Library</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Alias (e.g. Production Broker)"
                          value={hostAlias}
                          onChange={e => setHostAlias(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveHost();
                            }
                          }}
                          className="flex-1 px-3 py-2 text-sm bg-slate-950/50 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-200 placeholder-slate-600"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveHost}
                          disabled={!hostAlias.trim() || !host.trim()}
                          className="px-4 py-2 text-xs font-medium bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20"
                        >
                          Save
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="col-span-3 space-y-1">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value ? Number(e.target.value) : '')}
                    className="block w-full px-2 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-950/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-colors"
                    placeholder="8083"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Path</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Link2 className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-950/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-colors"
                    placeholder="/mqtt"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Client ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-950/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Authentication</label>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button" 
                      onClick={() => setShowCredLib(!showCredLib)} 
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    >
                      <Library className="w-3 h-3" /> Library
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSavingCred(!savingCred); setCredAlias(''); }}
                      className={cn(
                        "text-xs flex items-center gap-1 transition-colors",
                        savingCred ? "text-cyan-400 font-medium" : "text-slate-400 hover:text-cyan-400"
                      )}
                    >
                      <BookmarkPlus className="w-3 h-3" /> Save Current
                    </button>
                  </div>
                  
                  {/* Credentials Library Dropdown - 修复定位和层级 */}
                  {showCredLib && (
                    <div className="relative w-full">
                      <div 
                        className="absolute top-full right-0 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-[9999] py-1.5 mt-1"
                      >
                        <div className="max-h-64 overflow-y-auto">
                          {savedCredentials.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-slate-500 text-center flex flex-col items-center gap-1">
                              <Key className="w-6 h-6 opacity-50" />
                              <span>No saved credentials</span>
                              <span className="text-slate-600">Click "Save Current" to add</span>
                            </div>
                          ) : (
                            savedCredentials.map(sc => (
                              <div 
                                key={sc.id} 
                                className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-700/70 cursor-pointer group transition-colors"
                                onClick={() => { 
                                  setUsername(sc.username || ''); 
                                  setPassword(sc.password || ''); 
                                  setShowCredLib(false); 
                                }}
                              >
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="text-sm text-slate-200 font-medium truncate">{sc.alias}</div>
                                  <div className="text-xs text-slate-500 truncate">{sc.username || 'No username'}</div>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onDeleteCredential(sc.id); 
                                  }} 
                                  className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-slate-700 transition-all"
                                  title="Delete"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Save Credentials Form - 优化动画和样式 */}
                {savingCred && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50"
                  >
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Save Credentials</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Alias (e.g. Production Credentials)"
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
                              setSavingCred(false);
                              setCredAlias('');
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 text-sm bg-slate-950/50 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-200 placeholder-slate-600"
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
                            setSavingCred(false);
                            setCredAlias('');
                          }
                        }}
                        disabled={!credAlias.trim() || (!username.trim() && !password)}
                        className="px-4 py-2 text-xs font-medium bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20"
                      >
                        Save
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Username</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-slate-500" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-950/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-colors"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-4 w-4 text-slate-500" />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-950/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-colors"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors shadow-lg shadow-cyan-500/20"
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
