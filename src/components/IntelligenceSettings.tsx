import React, { useEffect, useState } from 'react';
import { useIntelligenceSettingsStore } from '../stores/intelligence-settings-store';
import { ProviderConfigModal } from './ProviderConfigModal';
import { HealthDashboardModal } from './HealthDashboardModal';
import { keyVaultRepo, ProviderConfigsMap } from '../storage/repositories/key-vault-repo';
import { Cpu, Zap, Database, Terminal, ShieldCheck, Activity, RefreshCw, Key, CheckCircle, Sliders, HeartPulse } from 'lucide-react';

export const IntelligenceSettings: React.FC = () => {
  const {
    aiEnabled,
    featureFlags,
    providerCount,
    activeProviderName,
    installedSkillsCount,
    cacheSize,
    logs,
    toggleAI,
    updateFlag,
    clearCache,
    refreshMetrics,
  } = useIntelligenceSettingsStore();

  const [savedConfigs, setSavedConfigs] = useState<ProviderConfigsMap>({});
  const [selectedProvider, setSelectedProvider] = useState<{ id: string; name: string; isLocal?: boolean } | null>(null);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);

  const fetchConfigs = async () => {
    const configs = await keyVaultRepo.getAll();
    setSavedConfigs(configs);
    refreshMetrics();
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const providersList = [
    { id: 'openai', name: 'OpenAI (GPT-4o / GPT-4o-mini)', isLocal: false },
    { id: 'anthropic', name: 'Anthropic (Claude 3.5 / Opus)', isLocal: false },
    { id: 'gemini', name: 'Google Gemini (1.5 Pro / Flash)', isLocal: false },
    { id: 'openrouter', name: 'OpenRouter Gateway (Unified)', isLocal: false },
    { id: 'ollama', name: 'Ollama (Local LLM)', isLocal: true },
    { id: 'lmstudio', name: 'LM Studio (Local Host)', isLocal: true },
    { id: 'azure', name: 'Azure OpenAI Service', isLocal: false },
    { id: 'bedrock', name: 'AWS Bedrock Gateway', isLocal: false },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6 bg-surface text-text-primary">
      {selectedProvider && (
        <ProviderConfigModal
          providerId={selectedProvider.id}
          providerName={selectedProvider.name}
          isLocal={selectedProvider.isLocal}
          isOpen={!!selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onSaved={fetchConfigs}
        />
      )}

      {/* Health Diagnostic Modal */}
      <HealthDashboardModal isOpen={isHealthModalOpen} onClose={() => setIsHealthModalOpen(false)} />

      {/* Header Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-pepper-500/10 border border-pepper-500/20 text-pepper-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">Intelligence Platform (BYOK)</h2>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-pepper-500/10 text-pepper-400 border border-pepper-500/20">
                Phase 2 Full
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Bring Your Own Keys &bull; Capability Router &bull; Local Vectors &bull; Zero Hardcoded Vendors
            </p>
          </div>
        </div>

        {/* Diagnostic Panel & Master AI Toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsHealthModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-pepper-500/30 bg-pepper-500/10 hover:bg-pepper-500/20 text-pepper-400 font-bold text-xs transition-colors"
          >
            <HeartPulse className="w-4 h-4" />
            <span>Health Check Panel</span>
          </button>

          <label className="flex items-center gap-3 cursor-pointer">
            <span className="text-xs font-semibold text-text-secondary">AI Master Switch</span>
            <div
              onClick={() => toggleAI(!aiEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                aiEnabled ? 'bg-pepper-500' : 'bg-border'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  aiEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </div>
          </label>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-surface-card border border-border rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Providers</span>
            <Zap className="w-4 h-4 text-pepper-400" />
          </div>
          <div className="text-xl font-bold text-text-primary">{providerCount}</div>
          <div className="text-[11px] text-text-muted truncate">
            Active: {activeProviderName || 'Mock Provider'}
          </div>
        </div>

        <div className="bg-surface-card border border-border rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Skills</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-text-primary">{installedSkillsCount}</div>
          <div className="text-[11px] text-text-muted">Summary, Title, Tags, Vectors</div>
        </div>

        <div className="bg-surface-card border border-border rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Cache Size</span>
            <Database className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-text-primary">{cacheSize} entries</div>
          <button onClick={clearCache} className="text-[10px] text-pepper-400 hover:underline font-medium">
            Clear Cache
          </button>
        </div>

        <div className="bg-surface-card border border-border rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Privacy Engine</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">Local First</div>
          <div className="text-[11px] text-text-muted">Keys stored locally</div>
        </div>
      </div>

      {/* BYOK Providers Configuration Grid */}
      <div className="bg-surface-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <Key className="w-4 h-4 text-pepper-500" />
            <span>Connect Providers (Bring Your Own Keys)</span>
          </h3>
          <span className="text-[11px] text-text-muted">Direct API requests from your machine</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {providersList.map((p) => {
            const config = savedConfigs[p.id];
            const isConfigured = !!config?.apiKey || (p.isLocal && !!config?.endpoint);

            return (
              <div
                key={p.id}
                className="p-3.5 rounded-xl border border-border/80 bg-surface/50 flex items-center justify-between hover:border-border transition-colors"
              >
                <div className="space-y-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-text-primary">{p.name}</span>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                        p.isLocal
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {p.isLocal ? 'LOCAL' : 'CLOUD'}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-muted flex items-center gap-1.5">
                    {isConfigured ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Configured ({config.model || 'default'})
                      </span>
                    ) : (
                      <span>Not Configured</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedProvider(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors shrink-0"
                >
                  <Sliders className="w-3.5 h-3.5 text-pepper-400" />
                  <span>Configure</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Flags Section */}
      <div className="bg-surface-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <Terminal className="w-4 h-4 text-pepper-500" />
          <span>Capability Feature Flags</span>
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-surface/40 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-text-primary">Semantic Search</div>
              <div className="text-[11px] text-text-muted">Vector embedding search over workspaces</div>
            </div>
            <input
              type="checkbox"
              checked={featureFlags.semanticSearch}
              onChange={(e) => updateFlag('semanticSearch', e.target.checked)}
              className="accent-pepper-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-surface/40 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-text-primary">Embeddings Engine</div>
              <div className="text-[11px] text-text-muted">Local vector index computation</div>
            </div>
            <input
              type="checkbox"
              checked={featureFlags.embeddings}
              onChange={(e) => updateFlag('embeddings', e.target.checked)}
              className="accent-pepper-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-surface/40 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-text-primary">Local Models (Ollama)</div>
              <div className="text-[11px] text-text-muted">Route offline workloads to local LLMs</div>
            </div>
            <input
              type="checkbox"
              checked={featureFlags.localModels}
              onChange={(e) => updateFlag('localModels', e.target.checked)}
              className="accent-pepper-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-surface/40 cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-text-primary">Experimental Providers</div>
              <div className="text-[11px] text-text-muted">Enable beta/custom LLM provider adapters</div>
            </div>
            <input
              type="checkbox"
              checked={featureFlags.experimentalProviders}
              onChange={(e) => updateFlag('experimentalProviders', e.target.checked)}
              className="accent-pepper-500"
            />
          </label>
        </div>
      </div>

      {/* Telemetry Log Output */}
      <div className="bg-surface-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Intelligence Telemetry &amp; Logs ({logs.length})
          </h3>
          <button onClick={fetchConfigs} className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="text-xs text-text-muted py-4 text-center border border-dashed border-border/60 rounded-lg">
            No intelligence execution logs recorded yet. Platform is fully active.
          </div>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto font-mono text-[11px]">
            {logs.map((log) => (
              <div key={log.id} className="p-2 rounded bg-surface border border-border/40 flex items-center justify-between">
                <span>[{log.status}] Task: {log.taskId}</span>
                <span className="text-text-muted">{log.durationMs}ms | Provider: {log.providerId}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
