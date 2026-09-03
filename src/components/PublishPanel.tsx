import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Hash, Radio, Send } from 'lucide-react';
import { MqttMessage } from '../hooks/useMqtt';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { TopicView } from './TopicView';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type TopicMode = 'existing' | 'custom';

interface PublishPanelProps {
  status: ConnectionStatus;
  topics: string[];
  messages: MqttMessage[];
  selectedTopic: string | null;
  onClear: () => void;
  onPublish: (topic: string, message: string, qos: 0 | 1 | 2) => Promise<void>;
}

export function PublishPanel({ status, topics, messages, selectedTopic, onClear, onPublish }: PublishPanelProps) {
  const { theme, themeClasses } = useTheme();
  const [topicMode, setTopicMode] = useState<TopicMode>(() => topics.length > 0 ? 'existing' : 'custom');
  const [existingTopic, setExistingTopic] = useState(() => selectedTopic && topics.includes(selectedTopic) ? selectedTopic : topics[0] || '');
  const [customTopic, setCustomTopic] = useState('');
  const [message, setMessage] = useState('{\n  "message": "Hello MQTT"\n}');
  const [qos, setQos] = useState<0 | 1 | 2>(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (selectedTopic && topics.includes(selectedTopic)) {
      setExistingTopic(selectedTopic);
    }
  }, [selectedTopic, topics]);

  useEffect(() => {
    if (topics.length > 0 && !topics.includes(existingTopic)) {
      setExistingTopic(topics[0]);
    } else if (topics.length === 0 && topicMode === 'existing') {
      setTopicMode('custom');
    }
  }, [topics, existingTopic, topicMode]);

  const targetTopic = useMemo(
    () => (topicMode === 'existing' ? existingTopic : customTopic).trim(),
    [topicMode, existingTopic, customTopic]
  );
  const isConnected = status === 'connected';
  const topicIsValid = targetTopic.length > 0 && !targetTopic.includes('#') && !targetTopic.includes('+');
  const previewTopic = topicIsValid ? targetTopic : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    if (!isConnected) {
      setFeedback({ type: 'error', message: 'Connect to a broker before publishing.' });
      return;
    }
    if (!topicIsValid) {
      setFeedback({ type: 'error', message: 'Enter a topic without + or # wildcard characters.' });
      return;
    }

    setIsPublishing(true);
    try {
      await onPublish(targetTopic, message, qos);
      setFeedback({ type: 'success', message: `Message published to ${targetTopic}.` });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to publish message.'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const inputClasses = cn(
    "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50",
    theme.mode === 'light'
      ? "bg-white text-slate-800 border-slate-300 placeholder-slate-400"
      : "bg-slate-950/60 text-slate-200 border-slate-700 placeholder-slate-500"
  );

  return (
    <div className="h-full min-h-0 grid grid-cols-[minmax(0,1fr)_minmax(380px,42%)] gap-2 overflow-hidden">
      <section className="h-full min-h-0 min-w-0 overflow-hidden">
        <TopicView topic={previewTopic} messages={messages} onClear={onClear} />
      </section>

      <aside className={cn(
        "h-full min-h-0 flex flex-col overflow-hidden border rounded-2xl",
        themeClasses.cardBg,
        themeClasses.border,
        themeClasses.shadow
      )}>
        <header className={cn("shrink-0 p-4 border-b", themeClasses.border, themeClasses.panelBg)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={cn("text-lg font-bold flex items-center gap-2.5", themeClasses.textPrimary)}>
                <span className={cn("p-1.5 rounded-lg", theme.mode === 'light' ? "bg-purple-100 text-purple-700" : "bg-purple-500/15 text-purple-300")}>
                  <Send className="w-4 h-4" />
                </span>
                Publish Message
              </h2>
              <p className={cn("mt-1.5 text-xs", themeClasses.textSecondary)}>
                The live data view follows the target topic.
              </p>
            </div>
            <div className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium",
              isConnected
                ? theme.mode === 'light' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : theme.mode === 'light' ? "bg-slate-100 border-slate-300 text-slate-600" : "bg-slate-800 border-slate-700 text-slate-400"
            )}>
              <Radio className="w-3 h-3" />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col gap-4 p-4 overflow-y-auto custom-scrollbar">
          <section className="shrink-0">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <label className={cn("text-sm font-semibold flex items-center gap-2", themeClasses.textPrimary)}>
                <Hash className="w-4 h-4 text-purple-400" />
                Topic
              </label>
              <div className={cn("flex p-1 rounded-lg border", themeClasses.border, themeClasses.bgTertiary)}>
                <button
                  type="button"
                  onClick={() => { setTopicMode('existing'); setFeedback(null); }}
                  disabled={topics.length === 0}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-40",
                    topicMode === 'existing'
                      ? "bg-purple-500 text-white"
                      : cn(themeClasses.textSecondary, theme.mode === 'light' ? "hover:bg-slate-200" : "hover:bg-slate-700")
                  )}
                >
                  Existing
                </button>
                <button
                  type="button"
                  onClick={() => { setTopicMode('custom'); setFeedback(null); }}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    topicMode === 'custom'
                      ? "bg-purple-500 text-white"
                      : cn(themeClasses.textSecondary, theme.mode === 'light' ? "hover:bg-slate-200" : "hover:bg-slate-700")
                  )}
                >
                  Custom
                </button>
              </div>
            </div>

            {topicMode === 'existing' ? (
              <select
                value={existingTopic}
                onChange={(event) => { setExistingTopic(event.target.value); setFeedback(null); }}
                className={inputClasses}
                aria-label="Existing topic"
              >
                {topics.map(topic => <option key={topic} value={topic}>{topic}</option>)}
              </select>
            ) : (
              <input
                type="text"
                value={customTopic}
                onChange={(event) => { setCustomTopic(event.target.value); setFeedback(null); }}
                className={inputClasses}
                placeholder="devices/device-1/command"
                aria-label="Custom topic"
              />
            )}
            <p className={cn("mt-1.5 text-[11px]", themeClasses.textSecondary)}>
              Publish topics cannot contain <code>+</code> or <code>#</code> wildcards.
            </p>
          </section>

          <section className="flex-1 min-h-[240px] flex flex-col">
            <div className="shrink-0 flex items-center justify-between gap-4 mb-2.5">
              <label htmlFor="publish-message" className={cn("text-sm font-semibold", themeClasses.textPrimary)}>
                Message payload
              </label>
              <span className={cn("text-xs font-mono", themeClasses.textSecondary)}>{message.length} chars</span>
            </div>
            <textarea
              id="publish-message"
              value={message}
              onChange={(event) => { setMessage(event.target.value); setFeedback(null); }}
              className={cn(inputClasses, "flex-1 min-h-0 resize-none font-mono leading-6")}
              spellCheck={false}
              placeholder="Enter message payload"
            />
          </section>

          {feedback && (
            <div className={cn(
              "shrink-0 flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs",
              feedback.type === 'success'
                ? theme.mode === 'light' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : theme.mode === 'light' ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            )} role="status">
              {feedback.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
              {feedback.message}
            </div>
          )}

          <footer className={cn("shrink-0 flex items-end gap-3 pt-3 border-t", themeClasses.border)}>
            <div className="w-44">
              <label htmlFor="publish-qos" className={cn("block text-xs font-semibold mb-1.5", themeClasses.textPrimary)}>
                QoS
              </label>
              <select
                id="publish-qos"
                value={qos}
                onChange={(event) => setQos(Number(event.target.value) as 0 | 1 | 2)}
                className={inputClasses}
              >
                <option value={0}>0 — At most once</option>
                <option value={1}>1 — At least once</option>
                <option value={2}>2 — Exactly once</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={!isConnected || !topicIsValid || isPublishing}
              className="ml-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold shadow-lg shadow-purple-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {isPublishing ? 'Publishing…' : 'Publish'}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
