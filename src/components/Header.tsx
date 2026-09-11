import React from 'react';
import { Terminal, FolderCode, FileCode2, Download, Settings, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';
import { ProviderId, ProviderConfig } from '../types';

interface HeaderProps {
  activeTab: 'terminal' | 'workspace' | 'source' | 'setup';
  setActiveTab: (tab: 'terminal' | 'workspace' | 'source' | 'setup') => void;
  activeProvider: ProviderId;
  activeModel: string;
  onProviderChange: (provider: ProviderId, model: string) => void;
  providers: Record<ProviderId, ProviderConfig>;
  openConfig: () => void;
  openDownload: () => void;
  contextCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeProvider,
  activeModel,
  onProviderChange,
  providers,
  openConfig,
  openDownload,
  contextCount
}) => {
  const currentProvider = providers[activeProvider];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-200 px-4 py-3 select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Brand & Provider Model Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-wide text-lg font-mono">Code-CLI</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-slate-400">Multi-Provider Interactive Terminal Agent</p>
          </div>

          <div className="hidden lg:flex items-center ml-4 pl-4 border-l border-slate-800">
            {/* Quick Provider Switcher dropdown */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <select
                aria-label="Active Provider"
                value={activeProvider}
                onChange={(e) => {
                  const p = e.target.value as ProviderId;
                  onProviderChange(p, providers[p].defaultModel);
                }}
                className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer font-medium"
              >
                {(Object.values(providers) as ProviderConfig[]).map((prov) => (
                  <option key={prov.id} value={prov.id} className="bg-slate-900 text-slate-200">
                    {prov.name}
                  </option>
                ))}
              </select>

              <span className="text-slate-600">/</span>

              <select
                aria-label="Active Model"
                value={activeModel}
                onChange={(e) => onProviderChange(activeProvider, e.target.value)}
                className="bg-transparent border-none text-yellow-300 focus:outline-none cursor-pointer font-mono max-w-[180px] truncate"
              >
                {(currentProvider.models.includes(activeModel)
                  ? currentProvider.models
                  : [activeModel, ...currentProvider.models]
                ).map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-slate-200">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Center / Right: Tabs & Quick Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <nav className="flex items-center bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'terminal'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Terminal REPL
            </button>

            <button
              onClick={() => setActiveTab('workspace')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'workspace'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderCode className="w-3.5 h-3.5" />
              Workspace
              {contextCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">
                  {contextCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('source')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'source'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              CLI Codebase
            </button>

            <button
              onClick={() => setActiveTab('setup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'setup'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              Setup Guide
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={openConfig}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-medium transition-colors"
              title="Configure API Keys and Endpoints (/config)"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Config</span>
            </button>

            <button
              onClick={openDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-sm"
              title="Download standalone code-cli.cjs executable"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Get CLI</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
