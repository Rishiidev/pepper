import { describe, it, expect } from 'vitest';
import { validateBackup, BACKUP_FORMAT } from '../backup-validate';

const goodSession = {
  id: 's1',
  name: 'Work',
  tabs: [
    { url: 'https://a.com', title: 'A', favIconUrl: '', index: 0 },
    { url: 'javascript:alert(1)', title: 'bad', favIconUrl: '', index: 1 },
  ],
  createdAt: 1,
  captureType: 'weird',
};

describe('validateBackup', () => {
  it('accepts a backup and drops unsafe tabs', () => {
    const res = validateBackup({ format: BACKUP_FORMAT, version: 1, sessions: [goodSession] });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.backup.sessions[0].tabs).toHaveLength(1);
      expect(res.backup.sessions[0].tabCount).toBe(1);
      expect(res.backup.sessions[0].captureType).toBe('manual');
    }
  });

  it('accepts the legacy bare-array export', () => {
    const res = validateBackup([goodSession]);
    expect(res.ok).toBe(true);
  });

  it('rejects other JSON and newer versions', () => {
    expect(validateBackup({ hello: 1 }).ok).toBe(false);
    expect(validateBackup('nope').ok).toBe(false);
    expect(validateBackup({ format: BACKUP_FORMAT, version: 99, sessions: [] }).ok).toBe(false);
  });

  it('counts skipped sessions and never imports API keys', () => {
    const res = validateBackup({
      format: BACKUP_FORMAT,
      version: 1,
      sessions: [goodSession, { id: 'bad' }],
      settings: { theme: 'light', apiKey: 'sk-secret', maxAutoCaptures: 'lots' },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.skipped).toBe(1);
      expect(res.backup.settings).toEqual({ theme: 'light' });
    }
  });
});
