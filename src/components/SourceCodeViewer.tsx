import React, { useState, useEffect } from 'react';
import { Copy, Check, FileCode, Folder, RefreshCw } from 'lucide-react';

const CLI_FILES = [
  {
    path: 'code-cli-standalone.cjs',
    title: 'code-cli-standalone.cjs (Single-File Executable)',
    badge: 'Standalone 0-Dep',
    desc: 'Self-contained executable requiring zero npm installs. Uses native Node.js fetch, readline, and ANSI streams.'
  },
  {
    path: 'bin/code-cli.js',
    title: 'bin/code-cli.js (CLI Binary Entrypoint)',
    badge: 'Executable',
    desc: 'Commander-based CLI binary entrypoint supporting flags like -p, -m, -c, -a, and -e.'
  },
  {
    path: 'cli/config.js',
    title: 'cli/config.js (Configuration & Persistence)',
    badge: 'Config',
    desc: 'Manages ~/.my-code-cli/config.json with restrictive 0600 file permissions and environment fallbacks.'
  },
  {
    path: 'cli/repl.js',
    title: 'cli/repl.js (Terminal REPL Engine)',
    badge: 'REPL',
    desc: 'Interactive chat loop with slash commands (/help, /add, /drop, /model, /files, /clear) and token streaming.'
  },
  {
    path: 'cli/diff.js',
    title: 'cli/diff.js (Diff Parser & Safe Writer)',
    badge: 'Diffing',
    desc: 'Extracts file modification blocks, computes line-by-line unified diffs, and interactively prompts for confirmation.'
  },
  {
    path: 'cli/context.js',
    title: 'cli/context.js (Context Scanner)',
    badge: 'Context',
    desc: 'Recursively scans directories, filters binary files and node_modules, and computes token estimates.'
  },
  {
    path: 'cli/providers/manager.js',
    title: 'cli/providers/manager.js (Multi-Provider Manager)',
    badge: 'Providers',
    desc: 'Orchestrates Gemini, OpenAI, Anthropic, and DashScope (Qwen), handling runtime model switches.'
  },
  {
    path: 'cli/providers/gemini.js',
    title: 'cli/providers/gemini.js (Google GenAI SDK)',
    badge: 'Gemini',
    desc: 'Direct integration with @google/genai SDK with streaming generateContentStream.'
  },
  {
    path: 'cli/providers/openai.js',
    title: 'cli/providers/openai.js (OpenAI & Compatible)',
    badge: 'OpenAI',
    desc: 'Supports direct OpenAI, Groq, OpenRouter, and local Ollama via customizable baseURL.'
  },
  {
    path: 'cli/providers/anthropic.js',
    title: 'cli/providers/anthropic.js (Anthropic Claude)',
    badge: 'Claude',
    desc: 'Claude 3.5 Sonnet & Claude 3 Opus integration via @anthropic-ai/sdk streaming.'
  },
  {
    path: 'cli/providers/dashscope.js',
    title: 'cli/providers/dashscope.js (Alibaba DashScope)',
    badge: 'Qwen',
    desc: 'Alibaba Cloud DashScope Qwen models via OpenAI-compatible endpoint.'
  },
  {
    path: 'cli/providers/openrouter.js',
    title: 'cli/providers/openrouter.js (OpenRouter 400+ Models)',
    badge: 'OpenRouter',
    desc: 'OpenRouter unified API integration with live listing for 400+ models, free tier support, and streaming.'
  },
  {
    path: 'cli/setup.js',
    title: 'cli/setup.js (Setup Wizard)',
    badge: 'Setup',
    desc: 'Interactive terminal questionnaire prompting for API keys, base URLs, and active defaults.'
  }
];

export const SourceCodeViewer: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState('code-cli-standalone.cjs');
  const [codeContent, setCodeContent] = useState<string>('Loading source file...');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeFile = CLI_FILES.find((f) => f.path === selectedPath) || CLI_FILES[0];

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/cli/source?path=${encodeURIComponent(selectedPath)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((data) => {
        if (!cancelled) {
          setCodeContent(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCodeContent(`// Could not load file: ${err.message}\n// Path: ${selectedPath}`);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPath]);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-65px)] bg-slate-950 text-slate-200 font-mono">
      {/* File Navigation */}
      <div className="w-full lg:w-80 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-3 border-b border-slate-800 flex items-center gap-2">
          <Folder className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            CLI Codebase Modules
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {CLI_FILES.map((f) => {
            const isSelected = f.path === selectedPath;
            return (
              <div
                key={f.path}
                onClick={() => setSelectedPath(f.path)}
                className={`p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 truncate font-bold text-white">
                    <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="truncate">{f.path}</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700">
                    {f.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-sans line-clamp-2">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Code Viewer */}
      <div className="flex-1 flex flex-col bg-slate-950">
        <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between font-sans">
          <div>
            <h3 className="text-sm font-bold text-white font-mono">{activeFile.path}</h3>
            <p className="text-xs text-slate-400">{activeFile.desc}</p>
          </div>

          <div className="flex items-center gap-2">
            {isLoading && (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400 mr-2" />
            )}
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied File!' : 'Copy Code'}
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 relative overflow-auto p-4 bg-slate-950 font-mono text-xs leading-5 text-slate-200 whitespace-pre selection:bg-emerald-500/30">
          {codeContent}
        </div>
      </div>
    </div>
  );
};
