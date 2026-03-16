import React, { useState } from 'react';
import { Server, Lock, User, Key, Plug, Unplug, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { IClientOptions } from 'mqtt';

interface ConnectionPanelProps {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  errorMsg: string | null;
  onConnect: (url: string, options: IClientOptions) => void;
  onDisconnect: () => void;
}

export function ConnectionPanel({ status, errorMsg, onConnect, onDisconnect }: ConnectionPanelProps) {
  const [url, setUrl] = useState('ws://broker.emqx.io:8083/mqtt');
  const [clientId, setClientId] = useState(`mqttjs_${Math.random().toString(16).substr(2, 8)}`);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'connected') {
      onDisconnect();
    } else {
      onConnect(url, {
        clientId,
        username: username || undefined,
        password: password || undefined,
        clean: true,
      });
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Server className="w-5 h-5 text-cyan-400" />
          Broker Connection
        </h2>
        
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            {status === 'connected' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={cn(
              "relative inline-flex rounded-full h-3 w-3",
              status === 'connected' ? 'bg-emerald-500' :
              status === 'connecting' ? 'bg-amber-500' :
              status === 'error' ? 'bg-rose-500' : 'bg-slate-500'
            )}></span>
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {status}
          </span>
        </div>
      </div>

      <form onSubmit={handleConnect} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Broker URL</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Plug className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={status === 'connected' || status === 'connecting'}
              className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-colors disabled:opacity-50"
              placeholder="ws://broker.hivemq.com:8000/mqtt"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                disabled={status === 'connected' || status === 'connecting'}
                className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-colors disabled:opacity-50"
              />
            </div>
          </div>

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
                disabled={status === 'connected' || status === 'connecting'}
                className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-colors disabled:opacity-50"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={status === 'connected' || status === 'connecting'}
                className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-colors disabled:opacity-50"
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'connecting'}
          className={cn(
            "w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900",
            status === 'connected' 
              ? "bg-rose-500 hover:bg-rose-600 focus:ring-rose-500 shadow-rose-500/20" 
              : "bg-cyan-500 hover:bg-cyan-600 focus:ring-cyan-500 shadow-cyan-500/20 disabled:opacity-50"
          )}
        >
          {status === 'connected' ? (
            <>
              <Unplug className="w-4 h-4" /> Disconnect
            </>
          ) : status === 'connecting' ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Connecting...
            </>
          ) : (
            <>
              <Plug className="w-4 h-4" /> Connect
            </>
          )}
        </button>
      </form>
    </div>
  );
}
