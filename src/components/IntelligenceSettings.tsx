import React, { useEffect, useState } from 'react';
import { useIntelligenceSettingsStore } from '../stores/intelligence-settings-store';
import { ProviderConfigModal } from './ProviderConfigModal';
import { HealthDashboardModal } from './HealthDashboardModal';
import { keyVaultRepo, ProviderConfigsMap } from '../storage/repositories/key-vault-repo';
import { Button, Card, CardHeader, Chip, Switch } from './ui';

/** Only providers that are actually implemented. */
const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', detail: 'GPT-4o mini and others', isLocal: false },
  { id: 'anthropic', name: 'Anthropic', detail: 'Claude', isLocal: false },
  { id: 'gemini', name: 'Google Gemini', detail: 'Gemini Flash and Pro', isLocal: false },
  { id: 'openrouter', name: 'OpenRouter', detail: 'One key, many models', isLocal: false },
  { id: 'ollama', name: 'Ollama', detail: 'Runs on your computer', isLocal: true },
];

const FLAGS: Array<{ key: 'semanticSearch' | 'embeddings' | 'localModels'; label: string; hint: string }> = [
  { key: 'semanticSearch', label: 'Meaning-based search', hint: 'Find workspaces by idea, not just words. Needs a provider.' },
  { key: 'embeddings', label: 'Local search index', hint: 'Builds a private index on this device.' },
  { key: 'localModels', label: 'Use local models when possible', hint: 'Prefer Ollama over cloud providers.' },
];

const COMMAND_NAMES: Record<string, string> = {
  _execute_action: 'Open the Pepper popup',
  'save-session': 'Save this window',
  'save-and-close-current-tab': 'Save this tab and close it',
  'add-tab-to-workspace': 'Add this tab to the active workspace',
  'open-manager': 'Open the dashboard',
  'open-side-panel': 'Open the side panel',
  'restore-last': 'Restore the most recent workspace',
  'toggle-focus-timer': 'Pause or resume the focus timer',
};

/** Optional AI, keyboard shortcuts. Everything else in Pepper works without any of this. */
export const IntelligenceSettings: React.FC = () => {
  const { aiEnabled, featureFlags, activeProviderName, cacheSize, toggleAI, updateFlag, clearCache, refreshMetrics } = useIntelligenceSettingsStore();
  const [configs, setConfigs] = useState<ProviderConfigsMap>({});
  const [selected, setSelected] = useState<(typeof PROVIDERS)[number] | null>(null);
  const [health, setHealth] = useState(false);
  const [commands, setCommands] = useState<Array<{ name?: string; shortcut?: string }>>([]);

  const load = async () => {
    setConfigs(await keyVaultRepo.getAll());
    void refreshMetrics();
  };
  const loadCommands = async () => {
    try {
      setCommands(await chrome.commands.getAll());
    } catch {
      // not in an extension page
    }
  };

  useEffect(() => {
    void load();
    void loadCommands();
    const onFocus = () => void loadCommands();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return (
    <>
      {selected && <ProviderConfigModal providerId={selected.id} providerName={selected.name} isLocal={selected.isLocal} isOpen onClose={() => setSelected(null)} onSaved={load} />}
      <HealthDashboardModal isOpen={health} onClose={() => setHealth(false)} />

      <Card as="section" aria-labelledby="ai-title" className="space-y-4">
        <CardHeader eyebrow="Optional" titleId="ai-title" title="AI features" />
        <p className="text-sm text-text-secondary">
          Everything in Pepper works without AI. Add your own provider for smarter workspace names and summaries. Your key stays in this browser and goes only to the provider you choose.
        </p>
        <label className="flex items-center justify-between gap-4 rounded-inner bg-surface-active px-4 py-3">
          <span>
            <span className="block text-sm font-semibold">Use AI for names and summaries</span>
            <span className="block text-xs text-text-muted">{aiEnabled ? `Using ${activeProviderName || 'no provider yet'}` : 'Off. Pepper names workspaces on your device.'}</span>
          </span>
          <Switch checked={aiEnabled} onChange={(v) => void toggleAI(v)} label="Use AI for names and summaries" />
        </label>

        <ul className="divide-y divide-border">
          {PROVIDERS.map((p) => {
            const c = configs[p.id];
            const ready = !!c?.apiKey || (p.isLocal && !!c?.endpoint);
            return (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {p.name} <Chip tone={p.isLocal ? 'mint' : 'neutral'}>{p.isLocal ? 'On your device' : 'Cloud'}</Chip>
                  </p>
                  <p className="text-xs text-text-muted">{p.detail}</p>
                </div>
                {ready && <Chip tone="mint">Connected</Chip>}
                <Button size="sm" onClick={() => setSelected(p)}>
                  {ready ? 'Edit' : 'Set up'}
                </Button>
              </li>
            );
          })}
        </ul>

        <details className="rounded-inner border border-border px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold">Advanced</summary>
          <div className="mt-3 space-y-3">
            {FLAGS.map((f) => (
              <label key={f.key} className="flex items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-semibold">{f.label}</span>
                  <span className="block text-xs text-text-muted">{f.hint}</span>
                </span>
                <Switch checked={featureFlags[f.key]} onChange={(v) => void updateFlag(f.key, v)} label={f.label} />
              </label>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={() => setHealth(true)}>
                Check connections
              </Button>
              <Button size="sm" variant="ghost" onClick={clearCache}>
                Clear AI cache ({cacheSize})
              </Button>
            </div>
          </div>
        </details>
      </Card>

      <Card as="section" aria-labelledby="keys-title" className="space-y-3">
        <CardHeader
          eyebrow="Keyboard"
          titleId="keys-title"
          title="Shortcuts"
          action={
            <Button size="sm" onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}>
              Change in Chrome
            </Button>
          }
        />
        <ul className="divide-y divide-border">
          {commands
            .filter((c) => c.name && COMMAND_NAMES[c.name])
            .map((c) => (
              <li key={c.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>{COMMAND_NAMES[c.name!]}</span>
                {c.shortcut ? <kbd className="rounded-md border border-border-strong px-2 py-0.5 font-mono text-xs" style={{ borderColor: 'var(--pp-border-strong)' }}>{c.shortcut}</kbd> : <span className="text-xs text-text-muted">Not set</span>}
              </li>
            ))}
        </ul>
      </Card>
    </>
  );
};
