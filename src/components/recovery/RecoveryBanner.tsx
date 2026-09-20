import React, { useCallback, useEffect, useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { PepperSession } from '../../core/types/session';
import { recoveryEngine } from '../../core/engines/recovery-engine';
import { restoreEngine } from '../../core/engines/restore-engine';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { FaviconStack } from '../ui/FaviconStack';

interface Props {
  compact?: boolean;
}

/**
 * After Chrome quit or crashed, Pepper rebuilds windows from its last known state.
 * This card offers them back. It is a needs-attention (butter) card.
 */
export const RecoveryBanner: React.FC<Props> = ({ compact = false }) => {
  const [recovered, setRecovered] = useState<PepperSession[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRecovered(await recoveryEngine.getRecoveredSessions());
  }, []);

  useEffect(() => {
    void load();
    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return;
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.pepper_last_updated) void load();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [load]);

  if (recovered.length === 0) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      await load();
    }
  };

  return (
    <Card tone="butter" as="section" aria-labelledby="recovery-title" pad={compact ? 'sm' : 'md'} className="space-y-3" data-testid="recovery-card">
      <CardHeader
        eyebrow="Needs attention"
        titleId="recovery-title"
        title={`${recovered.length} window${recovered.length !== 1 ? 's' : ''} recovered`}
        icon={<LifeBuoy className="w-4 h-4" />}
      />
      <p className="text-sm opacity-90">Chrome closed unexpectedly. Your tabs are safe.</p>

      <ul className={`space-y-1.5 ${compact ? 'max-h-28 overflow-y-auto' : ''}`}>
        {recovered.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-inner bg-black/5 dark:bg-white/5 px-3 py-2">
            <FaviconStack items={s.tabs} max={3} size={22} ring="var(--pp-butter-bg)" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{s.name}</p>
              <p className="text-xs opacity-80">{s.tabCount} tabs</p>
            </div>
            <Button size="sm" disabled={busy} aria-label={`Restore ${s.name}`} onClick={() => run(() => restoreEngine.restoreSession(s.id))}>
              Restore
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => run(() => recoveryEngine.restoreAllRecovered())}>
          Restore all
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => recoveryEngine.dismissRecovered(recovered.map((s) => s.id)))}>
          Dismiss
        </Button>
      </div>
    </Card>
  );
};
