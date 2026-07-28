import React, { useState, useEffect } from 'react';
import { keyVaultRepo, ProviderConfig } from '../storage/repositories/key-vault-repo';
import { providerRegistry } from '../core/intelligence/registry/provider-registry';
import { OpenAIProvider } from '../core/intelligence/providers/openai';
import { AnthropicProvider } from '../core/intelligence/providers/anthropic';
import { GeminiProvider } from '../core/intelligence/providers/gemini';
import { OllamaProvider } from '../core/intelligence/providers/ollama';
import { OpenRouterProvider } from '../core/intelligence/providers/openrouter';
import { X, Key, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  providerId: string;
  providerName: string;
  isLocal?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ProviderConfigModal: React.FC<Props> = ({
  providerId,
  providerName,
  isLocal = false,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState(isLocal ? 'http://localhost:11434' : '');
  const [model, setModel] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [testing, setTesting] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{ isHealthy: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen && providerId) {
      keyVaultRepo.get(providerId).then((existing) => {
        if (existing) {
          if (existing.apiKey) setApiKey(existing.apiKey);
          if (existing.endpoint) setEndpoint(existing.endpoint);
          if (existing.model) setModel(existing.model);
          if (existing.enabled !== undefined) setEnabled(existing.enabled);
        }
      });
    }
  }, [isOpen, providerId]);

  if (!isOpen) return null;

  const createProviderInstance = () => {
    if (providerId === 'openai') {
      return new OpenAIProvider({ apiKey, model: model || 'gpt-4o-mini', endpoint: endpoint || undefined });
    } else if (providerId === 'anthropic') {
      return new AnthropicProvider({ apiKey, model: model || 'claude-3-5-sonnet-20241022' });
    } else if (providerId === 'gemini') {
      return new GeminiProvider({ apiKey, model: model || 'gemini-1.5-flash' });
    } else if (providerId === 'ollama') {
      return new OllamaProvider({ endpoint: endpoint || 'http://localhost:11434', model: model || 'llama3' });
    } else if (providerId === 'openrouter') {
      return new OpenRouterProvider({ apiKey, model: model || 'anthropic/claude-3.5-sonnet' });
    }
    return null;
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setHealthStatus(null);

    const provider = createProviderInstance();
    if (provider) {
      const health = await provider.healthCheck();
      setHealthStatus({
        isHealthy: health.isHealthy,
        message: health.isHealthy ? `Connected (${health.latencyMs}ms)` : health.errorMessage || 'Health check failed',
      });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    const config: Partial<ProviderConfig> = {
      id: providerId,
      enabled: true,
      apiKey: apiKey || undefined,
      endpoint: endpoint || undefined,
      model: model || undefined,
      lastHealthCheck: healthStatus
        ? {
            isHealthy: healthStatus.isHealthy,
            lastChecked: Date.now(),
            errorMessage: healthStatus.message,
          }
        : undefined,
    };

    await keyVaultRepo.save(providerId, config);

    // Register active provider into ProviderRegistry and activate it
    const provider = createProviderInstance();
    if (provider) {
      providerRegistry.register(provider);
      providerRegistry.setActiveProvider(provider.id);
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-pepper-500" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">{providerName} Config</h3>
                <span
                  className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                    isLocal
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}
                >
                  {isLocal ? 'LOCAL (Zero Cloud Leak)' : 'CLOUD (Direct API)'}
                </span>
              </div>
              <p className="text-[11px] text-text-muted">Bring Your Own Key (BYOK) setup</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:bg-surface-hover">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          {!isLocal && (
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-pepper-500"
              />
              <span className="text-[10px] text-text-muted mt-1 block">
                Keys are stored strictly in local browser storage.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Model Name</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={isLocal ? 'llama3' : 'gpt-4o-mini'}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-pepper-500"
            />
          </div>

          {(isLocal || providerId === 'openai') && (
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Custom Endpoint (Optional)</label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={isLocal ? 'http://localhost:11434' : 'https://api.openai.com/v1'}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-pepper-500"
              />
            </div>
          )}

          {/* Health Status Indicator */}
          {healthStatus && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                healthStatus.isHealthy
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {healthStatus.isHealthy ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{healthStatus.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-surface-hover transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-surface-hover">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-pepper-500 hover:bg-pepper-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-pepper-500/20 transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
