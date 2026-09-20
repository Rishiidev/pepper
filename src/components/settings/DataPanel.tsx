import React, { useRef, useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { PepperSession } from '../../core/types/session';
import { useSettingsStore } from '../../stores/settings-store';
import { useSessionStore } from '../../stores/session-store';
import { backupEngine, validateBackup } from '../../core/engines/backup-engine';
import { retentionEngine } from '../../core/engines/retention-engine';
import { Button, Card, CardHeader, Dialog, Field, Input, Switch, toast } from '../ui';

/** Backup, restore and retention controls. */
export const DataPanel: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const { fetchSessions } = useSessionStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState<PepperSession[] | null>(null);

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
    toast(`Exported ${backup.sessions.length} workspaces. API keys are never included.`);
  };

  const importBackup = async (file: File) => {
    setBusy(true);
    try {
      if (file.size > 100 * 1024 * 1024) throw new Error('File is too large (over 100 MB).');
      const result = validateBackup(JSON.parse(await file.text()));
      if (!result.ok) {
        toast(result.error);
        return;
      }
      const { added, updated, unchanged } = await backupEngine.importBackup(result.backup);
      await fetchSessions();
      toast(`Imported ${added} new, ${updated} updated, ${unchanged} unchanged${result.skipped ? `, ${result.skipped} unreadable skipped` : ''}`);
    } catch (err) {
      toast(err instanceof SyntaxError ? 'That file is not valid JSON' : (err as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const review = async () => {
    const list = await retentionEngine.preview();
    if (list.length === 0) toast('Nothing to clean up. Pinned and favorite workspaces are always kept.');
    else setExpired(list);
  };

  const confirmCleanup = async () => {
    setExpired(null);
    setBusy(true);
    try {
      const n = await retentionEngine.run();
      await fetchSessions();
      toast(`Removed ${n} old auto-capture${n !== 1 ? 's' : ''}`);
    } finally {
      setBusy(false);
    }
  };

  const num = (v: string) => Math.max(0, Math.min(3650, Math.floor(Number(v) || 0)));

  return (
    <Card as="section" aria-labelledby="data-title" className="space-y-5">
      <CardHeader eyebrow="Your data" titleId="data-title" title="Backup and cleanup" />
      <p className="text-sm text-text-secondary">Everything stays on this device. Export a backup so you never lose your workspaces.</p>

      <div className="flex flex-wrap gap-2">
        <Button onClick={exportBackup}>
          <Download className="w-4 h-4" aria-hidden="true" />
          Export backup (JSON)
        </Button>
        <Button disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4" aria-hidden="true" />
          Import backup
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose a Pepper backup file to import" onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])} />
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-semibold">Notify when a window is auto-saved</span>
            <span className="block text-xs text-text-muted">A quiet notification with Reopen and Rename</span>
          </span>
          <Switch checked={settings.notifyOnAutoCapture} onChange={(v) => updateSettings({ notifyOnAutoCapture: v })} label="Notify when a window is auto-saved" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Delete auto-saves older than (days)" hint="0 keeps them forever. Pinned and favorites are never deleted.">
            {(p) => <Input {...p} type="number" min={0} max={3650} value={settings.autoCaptureRetentionDays} onChange={(e) => updateSettings({ autoCaptureRetentionDays: num(e.target.value) })} />}
          </Field>
          <Field label="Keep at most this many auto-saves" hint="0 means unlimited. The oldest go first.">
            {(p) => <Input {...p} type="number" min={0} max={3650} value={settings.maxAutoCaptures} onChange={(e) => updateSettings({ maxAutoCaptures: num(e.target.value) })} />}
          </Field>
        </div>
        <Button disabled={busy} onClick={review}>
          <Trash2 className="w-4 h-4" aria-hidden="true" />
          Clean up now
        </Button>
      </div>

      <Dialog
        open={!!expired}
        onClose={() => setExpired(null)}
        title={`Delete ${expired?.length ?? 0} old auto-save${expired?.length === 1 ? '' : 's'}?`}
        footer={
          <>
            <Button onClick={() => setExpired(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmCleanup}>
              Delete
            </Button>
          </>
        }
      >
        These are auto-saved windows past your limits. Pinned and favorite workspaces are kept. This cannot be undone.
      </Dialog>
    </Card>
  );
};
