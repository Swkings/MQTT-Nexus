import React, { useState } from 'react';
import { BookmarkPlus, Hash, KeyRound, Pencil, Plus, Server, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';
import { SavedCredential, SavedHost, SavedTopicTemplate } from '../types';
import { cn } from '../lib/utils';

type LibraryTab = 'hosts' | 'credentials' | 'topics';

interface LibraryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  hosts: SavedHost[];
  setHosts: React.Dispatch<React.SetStateAction<SavedHost[]>>;
  credentials: SavedCredential[];
  setCredentials: React.Dispatch<React.SetStateAction<SavedCredential[]>>;
  topicTemplates: SavedTopicTemplate[];
  setTopicTemplates: React.Dispatch<React.SetStateAction<SavedTopicTemplate[]>>;
}

const createId = () => Math.random().toString(36).slice(2, 11);

export function LibraryManager({
  isOpen,
  onClose,
  hosts,
  setHosts,
  credentials,
  setCredentials,
  topicTemplates,
  setTopicTemplates,
}: LibraryManagerProps) {
  const { theme, themeClasses } = useTheme();
  const [tab, setTab] = useState<LibraryTab>('hosts');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [alias, setAlias] = useState('');
  const [host, setHost] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [topics, setTopics] = useState('');
  const [error, setError] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setAlias('');
    setHost('');
    setUsername('');
    setPassword('');
    setTopics('');
    setError('');
  };

  const selectTab = (nextTab: LibraryTab) => {
    setTab(nextTab);
    resetForm();
  };

  const startEditHost = (item: SavedHost) => {
    setEditingId(item.id);
    setAlias(item.alias);
    setHost(item.host);
    setError('');
  };

  const startEditCredential = (item: SavedCredential) => {
    setEditingId(item.id);
    setAlias(item.alias);
    setUsername(item.username || '');
    setPassword(item.password || '');
    setError('');
  };

  const startEditTopicTemplate = (item: SavedTopicTemplate) => {
    setEditingId(item.id);
    setAlias(item.alias);
    setTopics(item.topics.join('\n'));
    setError('');
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanAlias = alias.trim();
    if (!cleanAlias) {
      setError('Enter a name for this library item.');
      return;
    }

    if (tab === 'hosts') {
      const cleanHost = host.trim();
      if (!cleanHost) {
        setError('Enter a host.');
        return;
      }
      if (hosts.some(item => item.id !== editingId && item.alias.toLowerCase() === cleanAlias.toLowerCase())) {
        setError('A host with this name already exists.');
        return;
      }
      const item = { id: editingId || createId(), alias: cleanAlias, host: cleanHost };
      setHosts(previous => editingId ? previous.map(entry => entry.id === editingId ? item : entry) : [...previous, item]);
    } else if (tab === 'credentials') {
      if (!username.trim() && !password) {
        setError('Enter a username or password.');
        return;
      }
      if (credentials.some(item => item.id !== editingId && item.alias.toLowerCase() === cleanAlias.toLowerCase())) {
        setError('Credentials with this name already exist.');
        return;
      }
      const item = { id: editingId || createId(), alias: cleanAlias, username: username.trim(), password };
      setCredentials(previous => editingId ? previous.map(entry => entry.id === editingId ? item : entry) : [...previous, item]);
    } else {
      const cleanTopics = Array.from(new Set(topics.split(/[\n,]+/).map(topic => topic.trim()).filter(Boolean)));
      if (cleanTopics.length === 0) {
        setError('Enter at least one topic filter.');
        return;
      }
      if (topicTemplates.some(item => item.id !== editingId && item.alias.toLowerCase() === cleanAlias.toLowerCase())) {
        setError('A topic template with this name already exists.');
        return;
      }
      const item = { id: editingId || createId(), alias: cleanAlias, topics: cleanTopics };
      setTopicTemplates(previous => editingId ? previous.map(entry => entry.id === editingId ? item : entry) : [...previous, item]);
    }
    resetForm();
  };

  const inputClass = cn(
    'w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500',
    theme.mode === 'light' ? 'border-slate-300 bg-white text-slate-800' : 'border-slate-700 bg-slate-950 text-slate-200'
  );
  const items = tab === 'hosts' ? hosts : tab === 'credentials' ? credentials : topicTemplates;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close library manager"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] cursor-default bg-slate-950/70 backdrop-blur-sm"
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="library-manager-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className={cn('fixed left-1/2 top-1/2 z-[61] flex max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border shadow-2xl', themeClasses.cardBg, themeClasses.border, themeClasses.shadow)}
          >
            <header className={cn('flex items-center justify-between border-b px-5 py-4', themeClasses.border, themeClasses.panelBg)}>
              <div className="flex items-center gap-3">
                <BookmarkPlus className="h-5 w-5 text-cyan-500" />
                <h2 id="library-manager-title" className={cn('text-base font-semibold', themeClasses.textPrimary)}>Library Manager</h2>
              </div>
              <button type="button" onClick={onClose} className={cn('rounded-md p-1.5 transition-colors', themeClasses.textSecondary, 'hover:bg-slate-500/10')} title="Close" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className={cn('flex gap-1 border-b px-4 py-2', themeClasses.border)} role="tablist" aria-label="Library categories">
              {([
                ['hosts', 'Hosts', Server],
                ['credentials', 'Credentials', KeyRound],
                ['topics', 'Topic templates', Hash],
              ] as const).map(([id, label, Icon]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => selectTab(id)} className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors', tab === id ? theme.mode === 'light' ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-500/15 text-cyan-300' : cn(themeClasses.textSecondary, 'hover:bg-slate-500/10'))}>
                  <Icon className="h-4 w-4" />{label}
                </button>
              ))}
            </div>

            <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <form onSubmit={save} className="space-y-3">
                <h3 className={cn('text-sm font-semibold', themeClasses.textPrimary)}>{editingId ? 'Edit item' : 'Add item'}</h3>
                <label className={cn('block space-y-1 text-xs', themeClasses.textSecondary)}>
                  Name
                  <input className={inputClass} value={alias} onChange={event => setAlias(event.target.value)} autoComplete="off" />
                </label>
                {tab === 'hosts' && (
                  <label className={cn('block space-y-1 text-xs', themeClasses.textSecondary)}>
                    Host
                    <input className={inputClass} value={host} onChange={event => setHost(event.target.value)} placeholder="broker.example.com" autoComplete="off" />
                  </label>
                )}
                {tab === 'credentials' && (
                  <>
                    <label className={cn('block space-y-1 text-xs', themeClasses.textSecondary)}>
                      Username
                      <input className={inputClass} value={username} onChange={event => setUsername(event.target.value)} autoComplete="off" />
                    </label>
                    <label className={cn('block space-y-1 text-xs', themeClasses.textSecondary)}>
                      Password
                      <input className={inputClass} type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" />
                    </label>
                  </>
                )}
                {tab === 'topics' && (
                  <label className={cn('block space-y-1 text-xs', themeClasses.textSecondary)}>
                    Topic filters
                    <textarea className={cn(inputClass, 'min-h-28 font-mono')} value={topics} onChange={event => setTopics(event.target.value)} placeholder={'#\nfactory/+/status'} />
                  </label>
                )}
                {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}
                <div className="flex items-center gap-2 pt-1">
                  <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700">
                    {editingId ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {editingId ? 'Save changes' : 'Add to library'}
                  </button>
                  {editingId && <button type="button" onClick={resetForm} className={cn('rounded-md px-3 py-2 text-sm', themeClasses.textSecondary, 'hover:bg-slate-500/10')}>Cancel</button>}
                </div>
              </form>

              <section className="min-h-0">
                <h3 className={cn('mb-3 text-sm font-semibold', themeClasses.textPrimary)}>{tab === 'hosts' ? 'Saved hosts' : tab === 'credentials' ? 'Saved credentials' : 'Saved topic templates'} <span className={cn('font-normal', themeClasses.textSecondary)}>({items.length})</span></h3>
                <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                  {items.length === 0 ? (
                    <p className={cn('py-8 text-center text-sm', themeClasses.textSecondary)}>No items saved yet.</p>
                  ) : items.map(item => {
                    const itemName = 'alias' in item ? item.alias : '';
                    const detail = 'host' in item ? item.host : 'topics' in item ? item.topics.join(', ') : item.username || 'Password saved';
                    return (
                      <div key={item.id} className={cn('flex items-start gap-3 rounded-lg border p-3', themeClasses.border, theme.mode === 'light' ? 'bg-white/70' : 'bg-slate-900/40')}>
                        <div className="min-w-0 flex-1">
                          <p className={cn('truncate text-sm font-medium', themeClasses.textPrimary)}>{itemName}</p>
                          <p className={cn('mt-1 break-all text-xs', themeClasses.textSecondary)}>{detail}</p>
                          {'username' in item && item.username && <p className={cn('mt-1 text-xs', themeClasses.textSecondary)}>User: {item.username}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" onClick={() => tab === 'hosts' ? startEditHost(item as SavedHost) : tab === 'credentials' ? startEditCredential(item as SavedCredential) : startEditTopicTemplate(item as SavedTopicTemplate)} className={cn('rounded p-1.5', themeClasses.textSecondary, 'hover:bg-cyan-500/10 hover:text-cyan-500')} title={`Edit ${itemName}`} aria-label={`Edit ${itemName}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => tab === 'hosts' ? setHosts(previous => previous.filter(entry => entry.id !== item.id)) : tab === 'credentials' ? setCredentials(previous => previous.filter(entry => entry.id !== item.id)) : setTopicTemplates(previous => previous.filter(entry => entry.id !== item.id))} className={cn('rounded p-1.5', themeClasses.textSecondary, 'hover:bg-rose-500/10 hover:text-rose-500')} title={`Delete ${itemName}`} aria-label={`Delete ${itemName}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}