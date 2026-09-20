import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetDb, mkTab } from './test-db';
import { db } from '../../../storage/db';
import { validateBackup, BACKUP_FORMAT } from '../backup-validate';
import { splitSessionKeys } from '../../../storage/repositories/key-vault-repo';

vi.stubGlobal('localStorage', (() => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
})());

import { backupEngine } from '../backup-engine';
import { sessionEngine } from '../session-engine';

beforeEach(resetDb);

const base = { format: BACKUP_FORMAT, version: 2, sessions: [] as unknown[] };

describe('validateBackup allow-lists', () => {
  it('drops out-of-range enum and numeric settings', () => {
    const res = validateBackup({
      ...base,
      settings: { theme: 'evil', namingMode: 'x', saveScope: 'window', quickSaveDestination: 'nowhere', autoCaptureRetentionDays: -5, maxAutoCaptures: 1e9, nameTemplate: 'ok' },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.backup.settings).toEqual({ saveScope: 'window', nameTemplate: 'ok' });
    }
  });

  it('keeps valid enum values', () => {
    const res = validateBackup({ ...base, settings: { theme: 'dark', lazyRestore: false } });
    if (res.ok) expect(res.backup.settings).toEqual({ theme: 'dark', lazyRestore: false });
  });

  it('sanitizes focus sessions and never restores a running timer', () => {
    const res = validateBackup({
      ...base,
      focusSessions: [
        { id: 'f1', sessionId: 'w', workspaceName: 'W', mode: 'timer', status: 'active', startedAt: 5, durationSeconds: 60, elapsedSeconds: 3 },
        { id: 'f2', mode: 'bogus', status: 'completed' },
        { id: 'f3', mode: 'timer', status: 'completed', userReflection: 'evil' },
      ],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.backup.focusSessions.map((f) => f.id)).toEqual(['f1', 'f3']);
      expect(res.backup.focusSessions[0].status).toBe('canceled');
      expect(res.backup.focusSessions[1].userReflection).toBeUndefined();
    }
  });

  it('drops timeline events with unknown types or non-web URLs', () => {
    const res = validateBackup({
      ...base,
      timelineEvents: [
        { sessionId: 'b', ts: 1, type: 'tab_open', url: 'https://a.com' },
        { sessionId: 'b', ts: 2, type: 'nuke' },
        { sessionId: 'b', ts: 3, type: 'tab_open', url: 'javascript:alert(1)' },
      ],
    });
    if (res.ok) expect(res.backup.timelineEvents).toHaveLength(1);
  });

  it('accepts a v1 backup without the new sections', () => {
    const res = validateBackup({ format: BACKUP_FORMAT, version: 1, sessions: [] });
    if (res.ok) {
      expect(res.backup.focusSessions).toEqual([]);
      expect(res.backup.timelineEvents).toEqual([]);
    } else throw new Error('v1 must load');
  });
});

describe('backup round trip', () => {
  it('restores workspaces, focus history and the timeline after a wipe, and re-import is idempotent', async () => {
    const ws = await sessionEngine.createSession('W', [mkTab('https://a.com'), mkTab('https://b.com', 1)]);
    await db.focusSessions.add({ id: 'focus_1', sessionId: ws.id, workspaceName: 'W', mode: 'timer', durationSeconds: 60, elapsedSeconds: 60, status: 'completed', startedAt: 10, endedAt: 70 });
    await db.browserSessions.add({ id: 'bs1', startedAt: 1, lastEventAt: 5, startReason: 'startup' });
    await db.timelineEvents.add({ sessionId: 'bs1', ts: 2, type: 'tab_open', url: 'https://a.com' });

    const exported = await backupEngine.exportAll();
    expect(exported.timelineEvents[0]).not.toHaveProperty('id');
    const validated = validateBackup(JSON.parse(JSON.stringify(exported)));
    if (!validated.ok) throw new Error(validated.error);

    await resetDb();
    await backupEngine.importBackup(validated.backup);
    expect(await db.sessions.count()).toBe(1);
    expect((await db.focusSessions.get('focus_1'))?.status).toBe('completed');
    expect(await db.browserSessions.count()).toBe(1);
    expect(await db.timelineEvents.count()).toBe(1);

    await backupEngine.importBackup(validated.backup);
    expect(await db.timelineEvents.count()).toBe(1);
    expect(await db.focusSessions.count()).toBe(1);
  });
});

describe('splitSessionKeys', () => {
  it('keeps session-only keys off the persisted copy', () => {
    const { persisted, sessionKeys } = splitSessionKeys({
      a: { id: 'a', enabled: true, apiKey: 'secret-a', sessionOnly: true },
      b: { id: 'b', enabled: true, apiKey: 'secret-b' },
    });
    expect(persisted.a.apiKey).toBeUndefined();
    expect(persisted.a.sessionOnly).toBe(true);
    expect(persisted.b.apiKey).toBe('secret-b');
    expect(sessionKeys).toEqual({ a: 'secret-a' });
    expect(JSON.stringify(persisted)).not.toContain('secret-a');
  });
});
