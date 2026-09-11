import React, { useState } from 'react';
import { Download, Terminal, Copy, Check, ExternalLink, ShieldCheck, ArrowRight, Zap, Code, Package } from 'lucide-react';

interface SetupGuideProps {
  onClose?: () => void;
}

export const SetupGuide: React.FC<SetupGuideProps> = () => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleDownloadStandalone = () => {
    window.location.href = '/api/cli/download/standalone';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 text-slate-200">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase">
              <Zap className="w-4 h-4" />
              Production CLI Agent
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Run Code-CLI on Your Terminal
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Download the standalone zero-dependency executable or install the modular Node.js package.
              Supports Google Gemini, OpenRouter (400+ models), OpenAI, Anthropic Claude, and Alibaba Qwen.
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={handleDownloadStandalone}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Download className="w-4 h-4" />
              Download code-cli.cjs
            </button>
            <span className="text-[11px] text-center text-slate-500 font-mono">
              Single-file • Zero npm installs required
            </span>
          </div>
        </div>

        {/* Option 1: Standalone Single-File (Instant, 0-dep) */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">1</span>
              <h2 className="text-base font-bold text-white">Option A: Instant Standalone Executable (Recommended)</h2>
            </div>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
              Node 18+ Built-in
            </span>
          </div>
          <p className="text-xs text-slate-400">
            No <code className="text-slate-300 font-mono">npm install</code> required! Uses native Node.js fetch, readline, and ANSI streams.
          </p>

          <div className="relative bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-xs text-slate-200">
            <button
              onClick={() => copyToClipboard('curl -O https://ais-dev-zcuzrz5v43i46mwwhp5aza-656358962500.asia-southeast1.run.app/api/cli/download/standalone && node code-cli.cjs', 'optA')}
              className="absolute top-2.5 right-2.5 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Copy command"
            >
              {copiedCmd === 'optA' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <p className="text-slate-500"># 1. Download and run standalone CLI directly:</p>
            <p className="text-emerald-400 select-all">curl -o code-cli.cjs {typeof window !== 'undefined' ? window.location.origin : ''}/api/cli/download/standalone</p>
            <p className="text-slate-500 pt-1"># 2. Start the interactive REPL:</p>
            <p className="text-emerald-400 select-all">node code-cli.cjs</p>
          </div>
        </div>

        {/* Option 2: Full Modular Package (npm install & global link) */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold">2</span>
              <h2 className="text-base font-bold text-white">Option B: Full Modular Package & Global Binary (<code className="text-emerald-400 font-mono">code-cli</code>)</h2>
            </div>
            <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
              Commander + SDKs
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Use the repository's modular architecture with full SDKs (<code className="text-slate-300 font-mono">@google/genai</code>, <code className="text-slate-300 font-mono">openai</code>, <code className="text-slate-300 font-mono">@anthropic-ai/sdk</code>, <code className="text-slate-300 font-mono">commander</code>, <code className="text-slate-300 font-mono">chalk</code>).
          </p>

          <div className="relative bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-xs text-slate-200">
            <button
              onClick={() => copyToClipboard('npm install\nnpm link\ncode-cli --config', 'optB')}
              className="absolute top-2.5 right-2.5 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Copy command"
            >
              {copiedCmd === 'optB' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <p className="text-slate-500"># 1. Install dependencies:</p>
            <p className="text-cyan-400">npm install</p>
            <p className="text-slate-500 pt-1"># 2. Link globally as a terminal binary:</p>
            <p className="text-cyan-400">npm link</p>
            <p className="text-slate-500 pt-1"># 3. Configure API keys once:</p>
            <p className="text-cyan-400">code-cli --config</p>
            <p className="text-slate-500 pt-1"># 4. Start coding agent in any project folder:</p>
            <p className="text-emerald-400">code-cli</p>
          </div>
        </div>

        {/* Command Cheat Sheet */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Slash Commands & Flags Reference
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-bold">/add &lt;path&gt;</span>
              <p className="text-slate-400 font-sans text-[11px] mt-0.5">
                Recursively scans and loads files into active context (e.g. <code className="text-slate-300 font-mono">/add src</code>).
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-bold">/files</span>
              <p className="text-slate-400 font-sans text-[11px] mt-0.5">
                Inspects all active files in context with line count and token weight.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-bold">/model [prov:model]</span>
              <p className="text-slate-400 font-sans text-[11px] mt-0.5">
                Dynamically switch between Gemini, OpenAI, Claude, and Qwen on the fly.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-bold">/config</span>
              <p className="text-slate-400 font-sans text-[11px] mt-0.5">
                Interactive setup wizard for API keys and custom base URLs.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-bold">/clear</span>
              <p className="text-slate-400 font-sans text-[11px] mt-0.5">
                Flushes conversation history to prevent hallucination while keeping files loaded.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-bold">code-cli -e &quot;prompt&quot;</span>
              <p className="text-slate-400 font-sans text-[11px] mt-0.5">
                One-shot evaluation flag for shell scripts or quick CLI questions.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Configuration Storage */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Secure Local Key Storage
          </div>
          <p>
            All API keys and provider endpoints are stored on your local disk at{' '}
            <code className="text-slate-200 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
              ~/.my-code-cli/config.json
            </code>{' '}
            with strict user-only read/write permissions (<code className="text-slate-200 font-mono">0600</code>).
          </p>
        </div>
      </div>
    </div>
  );
};
