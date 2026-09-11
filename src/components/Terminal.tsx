import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TermIcon, Play, RefreshCw, Trash2, Check, FileCheck, Layers, ArrowUp, ArrowDown, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { TerminalMessage, ProviderId, WorkspaceFile } from '../types';

interface TerminalProps {
  messages: TerminalMessage[];
  onSendMessage: (text: string) => void;
  isStreaming: boolean;
  activeProvider: ProviderId;
  activeModel: string;
  onClearHistory: () => void;
  onApplyFileChange: (path: string, newContent: string) => void;
  onViewDiff: (path: string, newContent: string) => void;
  workspaceFiles: WorkspaceFile[];
  onAddFileToContext: (path: string) => void;
  openConfig: () => void;
  openModelSelector: () => void;
}

export const TerminalComponent: React.FC<TerminalProps> = ({
  messages,
  onSendMessage,
  isStreaming,
  activeProvider,
  activeModel,
  onClearHistory,
  onApplyFileChange,
  onViewDiff,
  workspaceFiles,
  onAddFileToContext,
  openConfig,
  openModelSelector
}) => {
  const [inputVal, setInputVal] = useState('');
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>([
    '/help',
    '/files',
    'Refactor Calculator to add modulo, power, and sqrt functions with unit tests'
  ]);

  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages or streaming tokens
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed || isStreaming) return;

    // Save to history
    setCommandHistory((prev) => [trimmed, ...prev.filter((c) => c !== trimmed)]);
    setHistoryIndex(-1);
    setInputVal('');

    // Handle instant local slash commands or delegate
    if (trimmed === '/clear' || trimmed === '/reset') {
      onClearHistory();
      return;
    }
    if (trimmed === '/config' || trimmed === '/setup') {
      openConfig();
      return;
    }
    if (trimmed === '/model') {
      openModelSelector();
      return;
    }

    onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(nextIdx);
      setInputVal(commandHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setInputVal('');
      } else {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[nextIdx]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple tab autocomplete for commands
      const slashCmds = ['/help', '/add', '/files', '/drop', '/model', '/config', '/clear', '/status'];
      const matched = slashCmds.find((c) => c.startsWith(inputVal.toLowerCase()));
      if (matched) {
        setInputVal(matched + ' ');
      }
    }
  };

  const inContextFiles = workspaceFiles.filter((f) => f.inContext);

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-slate-950 text-slate-200 font-mono">
      {/* Terminal Window Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>
          <span className="text-xs text-slate-300 font-medium">bash — code-cli REPL</span>
          <span className="text-[11px] text-slate-500">
            ({activeProvider}:{activeModel})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {inContextFiles.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
              <Layers className="w-3 h-3" />
              <span>{inContextFiles.length} files in context</span>
            </div>
          )}

          <button
            onClick={onClearHistory}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 text-xs flex items-center gap-1"
            title="Clear conversation history (/clear)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Output Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
        {/* Welcome Banner */}
        <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-2">
          <div className="text-emerald-400 font-bold text-sm flex items-center gap-2">
            <TermIcon className="w-4 h-4" />
            Code-CLI Terminal Coding Agent v1.0.0
          </div>
          <p className="text-slate-400">
            A production-ready coding assistant with multi-provider architecture (Gemini, OpenAI, Claude, DashScope),
            real-time streaming, AST-aware diff generation, and workspace context management.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Active Provider: <strong className="text-emerald-400">{activeProvider}</strong>
            </span>
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Active Model: <strong className="text-yellow-300">{activeModel}</strong>
            </span>
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Context Tokens: <strong>~{inContextFiles.reduce((acc, f) => acc + f.tokens, 0)}</strong>
            </span>
          </div>
        </div>

        {/* Message Logs */}
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            {msg.role === 'user' ? (
              <div className="flex items-start gap-2 text-emerald-400 font-semibold pt-2">
                <span className="text-emerald-500 select-none">code-cli &gt;</span>
                <span className="text-white whitespace-pre-wrap">{msg.content}</span>
              </div>
            ) : msg.role === 'system' ? (
              <div className="text-xs text-cyan-300/80 bg-cyan-950/30 border-l-2 border-cyan-500 pl-3 py-1 font-mono">
                {msg.content}
              </div>
            ) : (
              <div className="space-y-3 bg-slate-900/50 p-3.5 rounded-lg border border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-yellow-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Agent Response</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                </div>

                {/* Message Content with simple Markdown-like code formatting */}
                <div className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </div>

                {/* Proposed File Diff Cards if any were extracted */}
                {msg.proposedFiles && msg.proposedFiles.length > 0 && (
                  <div className="pt-2 space-y-2 border-t border-slate-800/80">
                    <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4" />
                      Proposed Workspace Changes ({msg.proposedFiles.length} file{msg.proposedFiles.length > 1 ? 's' : ''}):
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {msg.proposedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950 border border-slate-700/80 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold text-white flex items-center gap-2">
                              <span className="text-yellow-400 font-mono">{file.path}</span>
                              {file.applied && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30 flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  Applied
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">
                              Proposed {file.content.split('\n').length} lines of updated code
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onViewDiff(file.path, file.content)}
                              className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                              View Diff
                            </button>

                            {!file.applied ? (
                              <button
                                onClick={() => onApplyFileChange(file.path, file.content)}
                                className="px-3 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1 shadow transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                Apply to Workspace
                              </button>
                            ) : (
                              <span className="text-xs text-emerald-400 flex items-center gap-1 px-2 py-1 bg-emerald-950/40 rounded border border-emerald-800/40">
                                <Check className="w-3 h-3" />
                                Wrote to disk
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-yellow-400 animate-pulse pl-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Streaming tokens from {activeProvider} ({activeModel})...</span>
          </div>
        )}

        <div ref={outputEndRef} />
      </div>

      {/* Suggested Command Chips */}
      <div className="bg-slate-900/70 border-t border-slate-800/80 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs select-none">
        <span className="text-slate-500 text-[11px] font-sans">Quick prompts:</span>
        <button
          onClick={() => setInputVal('/help')}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 shrink-0 transition-colors"
        >
          /help
        </button>
        <button
          onClick={() => setInputVal('/files')}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 shrink-0 transition-colors"
        >
          /files
        </button>
        <button
          onClick={() => setInputVal('/add src/auth.ts')}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 shrink-0 transition-colors"
        >
          /add src/auth.ts
        </button>
        <button
          onClick={() => setInputVal('Refactor Calculator to add power, sqrt, and modulo with comprehensive tests')}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 shrink-0 transition-colors"
        >
          Refactor Calculator
        </button>
        <button
          onClick={() => setInputVal('/model')}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 shrink-0 transition-colors"
        >
          /model
        </button>
        <button
          onClick={openModelSelector}
          className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-700/50 shrink-0 transition-colors flex items-center gap-1 font-semibold"
        >
          <Sparkles className="w-3 h-3 text-rose-400" />
          OpenRouter (400+ models)
        </button>
        <button
          onClick={() => setInputVal('/config')}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 shrink-0 transition-colors"
        >
          /config
        </button>
      </div>

      {/* Terminal Command Input */}
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border-t border-slate-800 p-3 flex items-center gap-2"
      >
        <span className="text-emerald-400 font-bold select-none pl-1">
          code-cli({activeProvider})&gt;
        </span>

        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a coding question, request a refactor, or type /help..."
          disabled={isStreaming}
          className="flex-1 bg-transparent text-white border-none focus:outline-none text-sm placeholder:text-slate-500 font-mono"
          autoFocus
        />

        <button
          type="submit"
          disabled={!inputVal.trim() || isStreaming}
          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white transition-colors"
          title="Send command (Enter)"
        >
          {isStreaming ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-white" />
          )}
        </button>
      </form>
    </div>
  );
};
