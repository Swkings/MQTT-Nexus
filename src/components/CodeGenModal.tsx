import React, { useState, useEffect, useMemo } from 'react';
import { X, Copy, Check, Code2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateCode, Language } from '../lib/codeGen';
import { cn } from '../lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../contexts/ThemeContext';

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
  const { theme, themeClasses } = useTheme();
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: `rgba(0, 0, 0, ${theme.mode === 'light' ? 0.3 : 0.6})` }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={cn(
            "border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden",
            themeClasses.cardBg,
            themeClasses.border,
            themeClasses.shadow
          )}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between p-6 border-b",
            themeClasses.border
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                theme.overlay === 'transparent' ? "bg-cyan-500/10" : "bg-cyan-500/10"
              )}>
                <Code2 className={cn("w-6 h-6", theme.mode === 'light' ? "text-cyan-600" : "text-cyan-400")} />
              </div>
              <div>
                <h2 className={cn("text-xl font-bold", themeClasses.textPrimary)}>Generate Data Structure</h2>
                <p className={cn("text-sm", themeClasses.textSecondary)}>Convert JSON message to native code structures</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-xl transition-all",
                themeClasses.textSecondary,
                theme.mode === 'light' 
                  ? "hover:text-slate-700 hover:bg-slate-200" 
                  : "hover:text-slate-200 hover:bg-slate-700"
              )}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar - Language Selection */}
            <div className={cn(
              "w-full md:w-48 border-r p-4 space-y-2",
              themeClasses.border,
              themeClasses.bgSecondary
            )}>
              <p className={cn("text-xs font-semibold uppercase tracking-wider mb-4 px-2", themeClasses.textSecondary)}>
                Select Language
              </p>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setSelectedLang(lang.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group border",
                    selectedLang === lang.id
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                      : cn(
                          themeClasses.textSecondary, 
                          theme.mode === 'light' 
                            ? "hover:text-slate-700 hover:bg-slate-200 border-slate-300" 
                            : "hover:text-slate-200 hover:bg-slate-700 border-transparent"
                        )
                  )}
                >
                  <img src={lang.icon} alt={lang.name} className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" />
                  {lang.name}
                </button>
              ))}
            </div>

            {/* Code Preview */}
            <div className={cn("flex-1 flex flex-col overflow-hidden", themeClasses.bgTertiary)}>
              <div className={cn("flex items-center justify-between px-6 py-3 border-b", themeClasses.border, themeClasses.panelBg)}>
                <span className={cn("text-xs font-mono uppercase tracking-widest", themeClasses.textSecondary)}>{selectedLang} Output</span>
                <button
                  onClick={handleCopy}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                    copied
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : theme.mode === 'light' 
                        ? "bg-slate-200 text-slate-700 hover:bg-slate-300 border-slate-300" 
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700"
                  )}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              <div className={cn("flex-1 overflow-auto custom-scrollbar p-6", themeClasses.bgTertiary)}>
                <SyntaxHighlighter
                  language={currentLang.prism}
                  style={theme.mode === 'light' ? vs : vscDarkPlus}
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
          <div className={cn("p-4 border-t flex justify-end", themeClasses.border, themeClasses.panelBg)}>
            <button
              onClick={onClose}
              className={cn(
                "px-6 py-2 text-sm font-medium rounded-xl transition-all border",
                themeClasses.textSecondary,
                themeClasses.border,
                theme.mode === 'light' 
                  ? "bg-slate-200 hover:bg-slate-300" 
                  : "bg-slate-800 hover:bg-slate-700"
              )}
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
