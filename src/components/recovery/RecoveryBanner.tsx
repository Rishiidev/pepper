import React, { useCallback, useEffect, useState } from 'react';
import { LifeBuoy, RotateCcw } from 'lucide-react';
import { PepperSession } from '../../core/types/session';
import { recoveryEngine, ClosedWindowInfo } from '../../core/engines/recovery-engine';
import { restoreEngine } from '../../core/engines/restore-engine';

interface Props {
  compact?: boolean;
}

/**
 * Shown after Chrome quit or crashed with windows Pepper had to rebuild from its last
 * known state. Combines Pepper's own snapshots with what Chrome's session history still has.
 */
export const RecoveryBanner: React.FC<Props> = ({ compact = false }) => {
  const [recovered, setRecovered] = useState<PepperSession[]>([]);
  const [chromeClosed, setChromeClosed] = useState<ClosedWindowInfo[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [r, c] = await Promise.all([recoveryEngine.getRecoveredSessions(), recoveryEngine.getChromeClosedWindows(3)]);
    setRecovered(r);
    setChromeClosed(c);
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
    <section
      aria-labelledby="recovery-title"
      className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <LifeBuoy className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h2 id="recovery-title" className="text-sm font-bold text-text-primary">
            Restore your last session
          </h2>
          <p className="text-xs text-text-secondary">
            Chrome closed unexpectedly. Pepper rebuilt {recovered.length} window{recovered.length !== 1 ? 's' : ''} from its last known state.
          </p>
        </div>
      </div>

      <ul className={`space-y-1.5 ${compact ? 'max-h-28 overflow-y-auto' : ''}`}>
        {recovered.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-card border border-border px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">{s.name}</p>
              <p className="text-[10px] text-text-muted">{s.tabCount} tabs</p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => restoreEngine.restoreSession(s.id))}
              aria-label={`Restore ${s.name}`}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pepper-500 hover:bg-pepper-600 text-white text-[11px] font-bold disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              Restore
            </button>
          </li>
        ))}
      </ul>

      {chromeClosed.length > 0 && (
        <p className="text-[10px] text-text-muted">
          Chrome also remembers {chromeClosed.length} recently closed window{chromeClosed.length !== 1 ? 's' : ''}. Use
          “Reopen last closed window” to bring back the most recent one with its full history.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => recoveryEngine.restoreAllRecovered())}
          className="px-3 py-1.5 rounded-lg bg-pepper-500 hover:bg-pepper-600 text-white text-xs font-bold disabled:opacity-50"
        >
          Restore all
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => recoveryEngine.dismissRecovered(recovered.map((s) => s.id)))}
          className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-hover disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </section>
  );
};
