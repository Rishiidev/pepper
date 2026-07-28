import React, { useEffect } from 'react';
import { useIntelligenceSettingsStore } from '../stores/intelligence-settings-store';
import { Cpu, Zap, Database, Terminal, ShieldCheck, Activity, RefreshCw } from 'lucide-react';

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

  useEffect(() => {
    refreshMetrics();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6 bg-surface text-text-primary">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-pepper-500/10 border border-pepper-500/20 text-pepper-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">Intelligence Infrastructure</h2>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Phase 1.5 Ready
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Provider-Agnostic, Capability-Based AI Engine (0 Hardcoded Vendors)
            </p>
          </div>
        </div>

        {/* Master AI Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <span className="text-xs font-semibold text-text-secondary">AI Engine</span>
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-surface-card border border-border rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Providers</span>
            <Zap className="w-4 h-4 text-pepper-400" />
          </div>
          <div className="text-xl font-bold text-text-primary">{providerCount}</div>
          <div className="text-[11px] text-text-muted truncate">
            Active: {activeProviderName || 'None'}
          </div>
        </div>

        <div className="bg-surface-card border border-border rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Skills</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-text-primary">{installedSkillsCount}</div>
          <div className="text-[11px] text-text-muted">Registered in SkillRegistry</div>
        </div>

        <div className="bg-surface-card border border-border rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Cache Size</span>
            <Database className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-text-primary">{cacheSize} entries</div>
          <button
            onClick={clearCache}
            className="text-[10px] text-pepper-400 hover:underline font-medium"
          >
            Clear Cache
          </button>
        </div>

        <div className="bg-surface-card border border-border rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Architecture</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">100% Ready</div>
          <div className="text-[11px] text-text-muted">Capability-Based Router</div>
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
          <button
            onClick={refreshMetrics}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="text-xs text-text-muted py-4 text-center border border-dashed border-border/60 rounded-lg">
            No intelligence execution logs recorded yet. Architecture is ready.
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
