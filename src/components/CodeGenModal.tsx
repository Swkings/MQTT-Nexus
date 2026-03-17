import React, { useState, useEffect, useMemo } from 'react';
import { X, Copy, Check, Code2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateCode, Language } from '../lib/codeGen';
import { cn } from '../lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeGenModalProps {
  isOpen: boolean;
  onClose: () => void;
  json: any;
  topicName: string;
}

const LANGUAGES: { id: Language; name: string; icon: string; prism: string }[] = [
  { id: 'go', name: 'Go', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg', prism: 'go' },
  { id: 'python', name: 'Python', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg', prism: 'python' },
  { id: 'typescript', name: 'TypeScript', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg', prism: 'typescript' },
  { id: 'java', name: 'Java', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg', prism: 'java' },
  { id: 'cpp', name: 'C++', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg', prism: 'cpp' },
];

export function CodeGenModal({ isOpen, onClose, json, topicName }: CodeGenModalProps) {
  const [selectedLang, setSelectedLang] = useState<Language>('go');
  const [copied, setCopied] = useState(false);

  const currentLang = useMemo(() => LANGUAGES.find(l => l.id === selectedLang)!, [selectedLang]);

  const generatedCode = useMemo(() => {
    if (!json) return '';
    // Clean up topic name for root struct name
    const rootName = topicName.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'Message';
    return generateCode(json, selectedLang, rootName);
  }, [json, selectedLang, topicName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Code2 className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">Generate Data Structure</h2>
                <p className="text-sm text-slate-400">Convert JSON message to native code structures</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar - Language Selection */}
            <div className="w-full md:w-48 bg-slate-900/50 border-r border-slate-800 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Select Language</p>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setSelectedLang(lang.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                    selectedLang === lang.id
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
                  )}
                >
                  <img src={lang.icon} alt={lang.name} className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" />
                  {lang.name}
                </button>
              ))}
            </div>

            {/* Code Preview */}
            <div className="flex-1 flex flex-col bg-slate-950/50 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/30">
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{selectedLang} Output</span>
                <button
                  onClick={handleCopy}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    copied
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                  )}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-slate-950">
                <SyntaxHighlighter
                  language={currentLang.prism}
                  style={vscDarkPlus}
                  customStyle={{
                    background: 'transparent',
                    padding: 0,
                    margin: 0,
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    }
                  }}
                >
                  {generatedCode}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-xl text-sm font-medium transition-all border border-slate-700"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
