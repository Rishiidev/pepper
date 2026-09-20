import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useSettingsStore } from '../../stores/settings-store';
import { parseBlocklist } from '../../core/engines/tracking-policy';
import { timelineStore } from '../../core/engines/timeline-store';

/** Opt-in controls for the browser session timeline. */
export const TrackingSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const [blocklistText, setBlocklistText] = useState(settings.trackingBlocklist.join('\n'));
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setBlocklistText(settings.trackingBlocklist.join('\n')), [settings.trackingBlocklist]);

  const saveBlocklist = async () => {
    const list = parseBlocklist(blocklistText);
    await updateSettings({ trackingBlocklist: list });
    setBlocklistText(list.join('\n'));
    setNotice(`${list.length} site${list.length !== 1 ? 's' : ''} will never be recorded.`);
  };

  const deleteAll = async () => {
    if (!window.confirm('Delete your entire session timeline? Workspaces are not affected. This cannot be undone.')) return;
    await timelineStore.clearAll();
    setNotice('Timeline deleted.');
  };

  return (
    <section aria-labelledby="tracking-title" className="rounded-2xl border border-border bg-surface-card p-5 space-y-4">
      <div>
        <h2 id="tracking-title" className="text-sm font-bold text-text-primary">Session timeline</h2>
        <p className="text-xs text-text-muted">
          Records when Chrome opened and closed, and each tab you open, visit and close, with how long you were active. Off by default.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <label htmlFor="tracking-enabled" className="min-w-0">
          <span className="block text-xs font-semibold text-text-primary">Record my browser session</span>
          <span className="block text-xs text-text-muted">Local only. Incognito windows are never recorded.</span>
        </label>
        <input
          id="tracking-enabled"
          type="checkbox"
          checked={settings.sessionTrackingEnabled}
          onChange={(e) => updateSettings({ sessionTrackingEnabled: e.target.checked })}
          className="accent-pepper-500 w-4 h-4"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tracking-blocklist" className="block text-xs font-semibold text-text-primary">
          Never record these sites
        </label>
        <textarea
          id="tracking-blocklist"
          rows={4}
          value={blocklistText}
          onChange={(e) => setBlocklistText(e.target.value)}
          onBlur={saveBlocklist}
          placeholder={'mybank.com\nhealthportal.example.org'}
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary"
        />
        <p className="text-xs text-text-muted">One domain per line. Subdomains are included.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <label htmlFor="timeline-retention" className="min-w-0">
          <span className="block text-xs font-semibold text-text-primary">Keep timeline for (days)</span>
          <span className="block text-xs text-text-muted">0 keeps it forever.</span>
        </label>
        <input
          id="timeline-retention"
          type="number"
          min={0}
          max={3650}
          value={settings.timelineRetentionDays}
          onChange={(e) => updateSettings({ timelineRetentionDays: Math.max(0, Math.min(3650, Math.floor(Number(e.target.value) || 0))) })}
          className="w-20 bg-surface border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-text-primary text-right"
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={deleteAll} className="px-3 py-2 rounded-xl border border-border text-xs font-semibold text-red-500 hover:bg-red-500/10">
          Delete timeline data
        </button>
        <span className="flex items-center gap-1.5 text-xs text-text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          Never leaves this device
        </span>
      </div>

      {notice && <p role="status" className="text-xs font-medium text-emerald-500">{notice}</p>}
    </section>
  );
};
