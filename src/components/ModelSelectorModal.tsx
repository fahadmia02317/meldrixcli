import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Cpu, Sparkles, Search, RefreshCw, Layers, ExternalLink, Zap, Gift, Tag } from 'lucide-react';
import { ProviderId, ProviderConfig, OpenRouterModel } from '../types';

interface ModelSelectorModalProps {
  activeProvider: ProviderId;
  activeModel: string;
  providers: Record<ProviderId, ProviderConfig>;
  onSelect: (provider: ProviderId, model: string) => void;
  onClose: () => void;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  activeProvider,
  activeModel,
  providers,
  onSelect,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<ProviderId | 'openrouter_all'>(
    activeProvider === 'openrouter' ? 'openrouter_all' : activeProvider
  );
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>([]);
  const [loadingOpenRouter, setLoadingOpenRouter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterGroup, setSelectedFilterGroup] = useState<string>('all');
  const [customModelInput, setCustomModelInput] = useState('');

  // Fetch all OpenRouter models from our dedicated endpoint
  const fetchOpenRouterModels = async () => {
    setLoadingOpenRouter(true);
    try {
      const res = await fetch('/api/cli/openrouter/models');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models)) {
          setOpenRouterModels(data.models);
        }
      }
    } catch (err) {
      console.error('Failed to load OpenRouter models:', err);
    } finally {
      setLoadingOpenRouter(false);
    }
  };

  useEffect(() => {
    fetchOpenRouterModels();
  }, []);

  // Filter groups
  const filterPills = [
    { id: 'all', label: 'All Models' },
    { id: 'free', label: 'Free Models (:free)', icon: Gift },
    { id: 'deepseek', label: 'DeepSeek' },
    { id: 'anthropic', label: 'Anthropic' },
    { id: 'meta-llama', label: 'Meta Llama' },
    { id: 'google', label: 'Google' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'qwen', label: 'Qwen' },
    { id: 'mistralai', label: 'Mistral' }
  ];

  // Filtered OpenRouter models
  const filteredOpenRouterModels = useMemo(() => {
    let list = openRouterModels;

    if (selectedFilterGroup === 'free') {
      list = list.filter((m) => m.isFree);
    } else if (selectedFilterGroup !== 'all') {
      list = list.filter((m) => m.providerGroup === selectedFilterGroup || m.id.toLowerCase().includes(selectedFilterGroup));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [openRouterModels, selectedFilterGroup, searchQuery]);

  const handleApplyCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customModelInput.trim();
    if (!trimmed) return;
    onSelect('openrouter', trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Model & Provider Catalog</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 font-mono px-2 py-0.5 rounded border border-rose-500/30">
                  OpenRouter 400+ Models
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Switch provider or choose from 400+ live models available via OpenRouter API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Provider Tabs */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('openrouter_all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'openrouter_all'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-300" />
            <span>OpenRouter Catalog</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded font-mono">
              {openRouterModels.length > 0 ? openRouterModels.length : '400+'}
            </span>
          </button>

          {(Object.values(providers) as ProviderConfig[]).map((prov) => {
            const isSelected = activeTab === prov.id;
            return (
              <button
                key={prov.id}
                onClick={() => setActiveTab(prov.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${prov.badgeColor}`}></span>
                <span>{prov.name}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs">
          {/* TAB 1: OpenRouter Full Catalog (All Models) */}
          {activeTab === 'openrouter_all' && (
            <div className="space-y-4">
              {/* Search & Custom Model Header */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search all 400+ OpenRouter models (e.g. claude, deepseek-r1, llama-3.3, free)..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={fetchOpenRouterModels}
                  disabled={loadingOpenRouter}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-medium transition-colors shrink-0"
                  title="Refresh live models from OpenRouter API"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingOpenRouter ? 'animate-spin text-rose-400' : ''}`} />
                  <span>{loadingOpenRouter ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {filterPills.map((pill) => {
                  const isSelected = selectedFilterGroup === pill.id;
                  const Icon = pill.icon;
                  return (
                    <button
                      key={pill.id}
                      onClick={() => setSelectedFilterGroup(pill.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                        isSelected
                          ? 'bg-rose-500 text-white font-semibold shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      <span>{pill.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Model Direct Input Box */}
              <form
                onSubmit={handleApplyCustomModel}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <div className="flex-1 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-rose-400 shrink-0" />
                  <input
                    type="text"
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    placeholder="Enter any custom OpenRouter model ID (e.g. meta-llama/llama-3.3-70b-instruct:free)"
                    className="w-full bg-transparent border-none text-xs text-white placeholder:text-slate-500 focus:outline-none font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customModelInput.trim()}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-medium shrink-0 transition-colors"
                >
                  Use Custom Model ID
                </button>
              </form>

              {/* Results summary */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>
                  Showing <strong className="text-white">{filteredOpenRouterModels.length}</strong> of{' '}
                  <strong className="text-white">{openRouterModels.length}</strong> models
                </span>
                <span className="text-slate-500">Click any card to activate instantly</span>
              </div>

              {/* Models List Cards */}
              {loadingOpenRouter && openRouterModels.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-rose-400" />
                  <p className="text-xs">Fetching live model catalog from OpenRouter API...</p>
                </div>
              ) : filteredOpenRouterModels.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <p className="text-sm">No models found matching "{searchQuery}"</p>
                  <p className="text-xs text-slate-500">Try searching for "claude", "deepseek", "free", or clear the filter.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedFilterGroup('all');
                    }}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredOpenRouterModels.map((m) => {
                    const isCurrent = activeProvider === 'openrouter' && activeModel === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          onSelect('openrouter', m.id);
                          onClose();
                        }}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between ${
                          isCurrent
                            ? 'bg-rose-950/40 border-rose-500/60 shadow-md ring-1 ring-rose-500/50'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5 mb-1">
                            <span className="font-semibold text-white text-xs truncate" title={m.name}>
                              {m.name}
                            </span>
                            {isCurrent ? (
                              <span className="shrink-0 flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-medium border border-rose-500/30">
                                <Check className="w-3 h-3 text-rose-400" /> Active
                              </span>
                            ) : m.isFree ? (
                              <span className="shrink-0 text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold border border-emerald-500/30 flex items-center gap-1">
                                <Gift className="w-2.5 h-2.5" /> FREE
                              </span>
                            ) : null}
                          </div>

                          <p className="font-mono text-[10px] text-slate-400 truncate mb-1.5 select-all" title={m.id}>
                            {m.id}
                          </p>

                          {m.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                              {m.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                          <span className="bg-slate-900 px-1.5 py-0.5 rounded font-mono border border-slate-800">
                            {m.context_length ? `${Math.round(m.context_length / 1000)}k ctx` : '128k ctx'}
                          </span>
                          <span className="font-mono text-slate-300">
                            {m.promptPrice ? m.promptPrice : 'Standard'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Specific Provider Grid */}
          {activeTab !== 'openrouter_all' && (
            <div className="space-y-4">
              {(() => {
                const prov = providers[activeTab as ProviderId];
                if (!prov) return null;
                const isCurrentProvider = prov.id === activeProvider;

                return (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${prov.badgeColor}`}></span>
                        <span className="font-bold text-sm text-white">{prov.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {prov.id}
                        </span>
                      </div>
                      <a
                        href={prov.docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                      >
                        Docs <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-xs text-slate-400">{prov.description}</p>

                    {prov.id === 'openrouter' && (
                      <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-rose-300 text-xs">Want to browse all 400+ OpenRouter models?</p>
                          <p className="text-[11px] text-slate-400">Search, filter free models, and choose from DeepSeek, Claude, Llama, and more.</p>
                        </div>
                        <button
                          onClick={() => setActiveTab('openrouter_all')}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shrink-0 transition-colors"
                        >
                          Open Full Catalog
                        </button>
                      </div>
                    )}

                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-2">Available Models:</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {prov.models.map((m) => {
                          const isCurrent = isCurrentProvider && m === activeModel;
                          return (
                            <button
                              key={m}
                              onClick={() => {
                                onSelect(prov.id, m);
                                onClose();
                              }}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-mono text-xs text-left transition-all ${
                                isCurrent
                                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/50 font-semibold'
                                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <span className="truncate">{m}</span>
                              {isCurrent && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-1.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-mono">
            <span>Active:</span>
            <span className="text-emerald-400 font-semibold">{activeProvider}</span>
            <span>/</span>
            <span className="text-yellow-300 truncate max-w-[200px]">{activeModel}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
