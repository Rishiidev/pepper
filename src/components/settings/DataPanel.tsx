import React, { useRef, useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import { useSettingsStore } from '../../stores/settings-store';
import { useSessionStore } from '../../stores/session-store';
import { backupEngine, validateBackup } from '../../core/engines/backup-engine';
import { retentionEngine } from '../../core/engines/retention-engine';

type Notice = { kind: 'ok' | 'error'; text: string } | null;

function NumberField({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <label htmlFor={id} className="min-w-0">
        <span className="block text-xs font-semibold text-text-primary">{label}</span>
        <span className="block text-[11px] text-text-muted">{hint}</span>
      </label>
      <input
        id={id}
        type="number"
        min={0}
        max={3650}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(3650, Math.floor(Number(e.target.value) || 0))))}
        className="w-20 bg-surface-card border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-text-primary text-right"
      />
    </div>
  );
}

/** Backup, restore and retention controls. */
export const DataPanel: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const { fetchSessions } = useSessionStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  const exportBackup = async () => {
    const backup = await backupEngine.exportAll();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pepper-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setNotice({ kind: 'ok', text: `Exported ${backup.sessions.length} workspaces. API keys are never included.` });
  };

  const importBackup = async (file: File) => {
    setBusy(true);
    try {
      if (file.size > 100 * 1024 * 1024) throw new Error('File is too large (over 100 MB).');
      const result = validateBackup(JSON.parse(await file.text()));
      if (!result.ok) {
        setNotice({ kind: 'error', text: result.error });
        return;
      }
      const { added, updated, unchanged } = await backupEngine.importBackup(result.backup);
      await fetchSessions();
      const skipped = result.skipped ? `, ${result.skipped} unreadable skipped` : '';
      setNotice({ kind: 'ok', text: `Imported: ${added} new, ${updated} updated, ${unchanged} already up to date${skipped}.` });
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof SyntaxError ? 'That file is not valid JSON.' : (err as Error).message });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const cleanNow = async () => {
    const expired = await retentionEngine.preview();
    if (expired.length === 0) {
      setNotice({ kind: 'ok', text: 'Nothing to clean up. Pinned and favorite workspaces are always kept.' });
      return;
    }
    if (!window.confirm(`Delete ${expired.length} old auto-captured workspace${expired.length !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const n = await retentionEngine.run();
      await fetchSessions();
      setNotice({ kind: 'ok', text: `Removed ${n} old auto-capture${n !== 1 ? 's' : ''}.` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="data-title" className="rounded-2xl border border-border bg-surface-card p-5 space-y-4">
      <div>
        <h2 id="data-title" className="text-sm font-bold text-text-primary">Your data</h2>
        <p className="text-xs text-text-muted">Everything stays on this device. Back it up so you never lose your memory.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportBackup}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-pepper-500 hover:bg-pepper-600 text-white text-xs font-bold"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          Export backup (JSON)
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-text-primary hover:bg-surface-hover disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" aria-hidden="true" />
          Import backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Choose a Pepper backup file to import"
          onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])}
        />
      </div>

      <div className="border-t border-border pt-3 divide-y divide-border/60">
        <div className="flex items-center justify-between gap-4 pb-2">
          <label htmlFor="notify-capture" className="min-w-0">
            <span className="block text-xs font-semibold text-text-primary">Notify when a window is auto-saved</span>
            <span className="block text-[11px] text-text-muted">A silent notification with Reopen and Rename</span>
          </label>
          <input
            id="notify-capture"
            type="checkbox"
            checked={settings.notifyOnAutoCapture}
            onChange={(e) => updateSettings({ notifyOnAutoCapture: e.target.checked })}
            className="accent-pepper-500 w-4 h-4"
          />
        </div>
        <NumberField
          id="retention-days"
          label="Delete auto-captures older than (days)"
          hint="0 keeps them forever. Pinned and favorite workspaces are never deleted."
          value={settings.autoCaptureRetentionDays}
          onChange={(n) => updateSettings({ autoCaptureRetentionDays: n })}
        />
        <NumberField
          id="retention-max"
          label="Keep at most this many auto-captures"
          hint="0 means unlimited. The oldest are removed first."
          value={settings.maxAutoCaptures}
          onChange={(n) => updateSettings({ maxAutoCaptures: n })}
        />
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={cleanNow}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-text-primary hover:bg-surface-hover disabled:opacity-50"
      >
        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        Clean up now
      </button>

      {notice && (
        <p role="status" className={`text-xs font-medium ${notice.kind === 'ok' ? 'text-emerald-500' : 'text-red-500'}`}>
          {notice.text}
        </p>
      )}
    </section>
  );
};
