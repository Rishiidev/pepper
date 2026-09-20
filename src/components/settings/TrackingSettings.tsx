import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useSettingsStore } from '../../stores/settings-store';
import { parseBlocklist } from '../../core/engines/tracking-policy';
import { timelineStore } from '../../core/engines/timeline-store';
import { recordActivation } from '../../core/engines/activation';
import { Button, Card, CardHeader, Field, Input, Switch, toast } from '../ui';

/** Opt-in controls for the browser session timeline. */
export const TrackingSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const [blocklistText, setBlocklistText] = useState(settings.trackingBlocklist.join('\n'));

  useEffect(() => setBlocklistText(settings.trackingBlocklist.join('\n')), [settings.trackingBlocklist]);

  const saveBlocklist = async () => {
    const list = parseBlocklist(blocklistText);
    await updateSettings({ trackingBlocklist: list });
    setBlocklistText(list.join('\n'));
    toast(`${list.length} site${list.length !== 1 ? 's' : ''} will never be recorded`);
  };

  const deleteAll = async () => {
    if (!window.confirm('Delete your entire session timeline? Workspaces are not affected. This cannot be undone.')) return;
    await timelineStore.clearAll();
    toast('Timeline deleted');
  };

  return (
    <Card as="section" aria-labelledby="tracking-title" tone="lilac" className="space-y-4">
      <CardHeader eyebrow="Timeline" titleId="tracking-title" title="Session timeline" />
      <p className="text-sm">Records when Chrome opened and closed, and each tab you open, visit and close, with how long you were active. Off by default.</p>

      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-semibold">Record my browser session</span>
          <span className="block text-xs opacity-80">Local only. Incognito windows are never recorded.</span>
        </span>
        <Switch
          checked={settings.sessionTrackingEnabled}
          onChange={(v) => {
            void updateSettings({ sessionTrackingEnabled: v });
            if (v) void recordActivation('timeline');
          }}
          label="Record my browser session"
        />
      </label>

      <Field label="Never record these sites" hint="One domain per line. Subdomains are included.">
        {(p) => (
          <textarea
            {...p}
            rows={3}
            value={blocklistText}
            onChange={(e) => setBlocklistText(e.target.value)}
            onBlur={saveBlocklist}
            placeholder={'mybank.com\nhealthportal.example.org'}
            className="w-full rounded-input border bg-surface-card px-3 py-2 text-sm font-mono text-text-primary"
            style={{ borderColor: 'var(--pp-border-strong)' }}
          />
        )}
      </Field>

      <Field label="Keep timeline for (days)" hint="0 keeps it forever." className="max-w-40">
        {(p) => (
          <Input
            {...p}
            type="number"
            min={0}
            max={3650}
            value={settings.timelineRetentionDays}
            onChange={(e) => updateSettings({ timelineRetentionDays: Math.max(0, Math.min(3650, Math.floor(Number(e.target.value) || 0))) })}
          />
        )}
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={deleteAll}>Delete timeline data</Button>
        <span className="inline-flex items-center gap-1.5 text-sm">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          Never leaves this device
        </span>
      </div>
    </Card>
  );
};
