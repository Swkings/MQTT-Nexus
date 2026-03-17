import React from 'react';
import { Server, Plus, Trash2, Plug, Unplug, AlertCircle } from 'lucide-react';
import { BrokerConfig } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface BrokerSidebarProps {
  brokers: BrokerConfig[];
  activeBrokerId: string | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  errorMsg: string | null;
  onSelect: (broker: BrokerConfig) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export function BrokerSidebar({
  brokers,
  activeBrokerId,
  status,
  errorMsg,
  onSelect,
  onAdd,
  onDelete,
}: BrokerSidebarProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl shadow-black/50">
      <div className="p-4 border-b border-slate-700/50 bg-slate-900/20 shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          Brokers
        </h2>
        <button
          onClick={onAdd}
          className="p-1.5 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          title="Add Broker"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        <AnimatePresence initial={false}>
          {brokers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-slate-500 text-xs py-8"
            >
              No brokers added
            </motion.div>
          ) : (
            brokers.map((broker) => {
              const isActive = activeBrokerId === broker.id;
              return (
                <motion.div
                  key={broker.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                  className={cn(
                    "group relative p-3 rounded-xl border transition-all cursor-pointer overflow-hidden",
                    isActive
                      ? "bg-cyan-500/10 border-cyan-500/30 shadow-inner shadow-cyan-500/10"
                      : "bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600"
                  )}
                  onClick={() => onSelect(broker)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-slate-200 truncate">
                          {broker.name}
                        </span>
                        {isActive && (
                          <span className="relative flex h-2 w-2 shrink-0">
                            {status === 'connected' && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            )}
                            <span className={cn(
                              "relative inline-flex rounded-full h-2 w-2",
                              status === 'connected' ? 'bg-emerald-500' :
                              status === 'connecting' ? 'bg-amber-500' :
                              status === 'error' ? 'bg-rose-500' : 'bg-slate-500'
                            )}></span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono truncate" title={broker.url}>
                        {broker.url}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(broker.id);
                        }}
                        className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete Broker"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isActive && errorMsg && (
                    <div className="mt-2 flex items-start gap-1.5 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-[10px] leading-tight">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      <p className="break-words">{errorMsg}</p>
                    </div>
                  )}

                  {isActive && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(broker); // This will toggle connection in parent
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                          status === 'connected'
                            ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                            : status === 'connecting'
                            ? "bg-amber-500/20 text-amber-400 cursor-wait"
                            : "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                        )}
                      >
                        {status === 'connected' ? (
                          <>
                            <Unplug className="w-3.5 h-3.5" /> Disconnect
                          </>
                        ) : status === 'connecting' ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" /> Connecting...
                          </>
                        ) : (
                          <>
                            <Plug className="w-3.5 h-3.5" /> Connect
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
