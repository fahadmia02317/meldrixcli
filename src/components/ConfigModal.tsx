import React, { useState } from 'react';
import { X, Settings, ShieldCheck, Key, Globe, Check, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { ProviderId, ProviderConfig, CliConfig } from '../types';

interface ConfigModalProps {
  config: CliConfig;
  providers: Record<ProviderId, ProviderConfig>;
  onSaveConfig: (updated: CliConfig) => void;
  onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  config,
  providers,
  onSaveConfig,
  onClose
}) => {
  const [formData, setFormData] = useState<CliConfig>(JSON.parse(JSON.stringify(config)));
  const [copied, setCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const handleKeyChange = (provider: ProviderId, val: string) => {
    setFormData((prev) => ({
      ...prev,
      providers: {
        ...prev.providers,
        [provider]: {
          ...prev.providers[provider],
          apiKey: val
        }
      }
    }));
  };

  const handleUrlChange = (provider: ProviderId, val: string) => {
    setFormData((prev) => ({
      ...prev,
      providers: {
        ...prev.providers,
        [provider]: {
          ...prev.providers[provider],
          baseUrl: val
        }
      }
    }));
  };

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(formData, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSaveConfig(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">CLI Provider & API Key Configuration</h2>
              <p className="text-xs text-slate-400">
                Mirrors terminal <code className="text-emerald-400 font-mono">/config</code> setup stored in <code className="text-slate-300 font-mono">~/.my-code-cli/config.json</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* 1. Google Gemini */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="font-semibold text-white">Google Gemini API</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                  Recommended
                </span>
              </div>
              <span className="text-xs text-slate-500">SDK: @google/genai</span>
            </div>
            <p className="text-xs text-slate-400">
              Pre-configured on this web instance via server secrets, or supply your own custom key for local CLI runs.
            </p>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">GEMINI_API_KEY</label>
              <input
                type="password"
                value={formData.providers.gemini?.apiKey || ''}
                onChange={(e) => handleKeyChange('gemini', e.target.value)}
                placeholder="AIzaSy... (leave blank to use server environment default)"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 2. OpenAI & OpenAI-Compatible */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-white">OpenAI & OpenAI-Compatible</span>
              </div>
              <span className="text-xs text-slate-500">Groq, OpenRouter, Ollama, DeepSeek</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">OPENAI_API_KEY</label>
                <input
                  type="password"
                  value={formData.providers.openai?.apiKey || ''}
                  onChange={(e) => handleKeyChange('openai', e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Custom Base URL (Optional)</label>
                <input
                  type="text"
                  value={formData.providers.openai?.baseUrl || ''}
                  onChange={(e) => handleUrlChange('openai', e.target.value)}
                  placeholder="e.g. https://api.groq.com/openai/v1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Anthropic Claude */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="font-semibold text-white">Anthropic Claude API</span>
              </div>
              <span className="text-xs text-slate-500">Claude 3.5 Sonnet / Opus</span>
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">ANTHROPIC_API_KEY</label>
              <input
                type="password"
                value={formData.providers.anthropic?.apiKey || ''}
                onChange={(e) => handleKeyChange('anthropic', e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 4. Alibaba DashScope (Qwen) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                <span className="font-semibold text-white">Alibaba Cloud / DashScope (Qwen)</span>
              </div>
              <span className="text-xs text-slate-500">Qwen-Max, Qwen-Coder-32B</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">DASHSCOPE_API_KEY</label>
                <input
                  type="password"
                  value={formData.providers.dashscope?.apiKey || ''}
                  onChange={(e) => handleKeyChange('dashscope', e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">DashScope Base URL</label>
                <input
                  type="text"
                  value={formData.providers.dashscope?.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1'}
                  onChange={(e) => handleUrlChange('dashscope', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 5. OpenRouter (Access 400+ Models) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-rose-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="font-semibold text-white">OpenRouter API</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                  400+ Models Catalog
                </span>
              </div>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-slate-400">
              Unlock live access to Claude 3.7, DeepSeek R1, Llama 3.3, Gemini 2.0, Qwen, and free tier models (:free) with a single OpenRouter key.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">OPENROUTER_API_KEY</label>
                <input
                  type="password"
                  value={formData.providers.openrouter?.apiKey || ''}
                  onChange={(e) => handleKeyChange('openrouter', e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">OpenRouter Base URL</label>
                <input
                  type="text"
                  value={formData.providers.openrouter?.baseUrl || 'https://openrouter.ai/api/v1'}
                  onChange={(e) => handleUrlChange('openrouter', e.target.value)}
                  placeholder="https://openrouter.ai/api/v1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleCopyJson}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied config.json!' : 'Copy config.json for CLI'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
