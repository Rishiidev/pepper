import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, mkTab } from './test-db';
import { db } from '../../../storage/db';
import { sessionEngine } from '../session-engine';
import { sessionRepo } from '../../../storage/repositories/session-repo';
import { workspaceMembership } from '../workspace-membership';
import { hashUrlSet } from '../../utils/url-hash';

beforeEach(resetDb);

describe('sessionEngine', () => {
  it('creates, updates and deletes a workspace', async () => {
    const s = await sessionEngine.createSession('Docs', [mkTab('https://a.com'), mkTab('https://b.com', 1)]);
    expect(s.tabCount).toBe(2);
    expect((await sessionEngine.getSessionById(s.id))?.urlHash).toBe(hashUrlSet(['https://a.com', 'https://b.com']));
    await sessionEngine.updateSession(s.id, { name: 'Renamed' });
    expect((await sessionEngine.getSessionById(s.id))?.name).toBe('Renamed');
    await sessionEngine.deleteSession(s.id);
    expect(await sessionEngine.getSessionById(s.id)).toBeUndefined();
  });

  it('refuses an empty workspace', async () => {
    await expect(sessionEngine.createSession('x', [])).rejects.toThrow();
  });
});

describe('duplicate capture check (indexed)', () => {
  it('finds the same URL set in any order and rejects near misses', async () => {
    await sessionEngine.createSession('S', [mkTab('https://a.com'), mkTab('https://b.com', 1)]);
    expect(await sessionRepo.hasUrlSet(['https://b.com', 'https://a.com'])).toBe(true);
    expect(await sessionRepo.hasUrlSet(['https://a.com'])).toBe(false);
    expect(await sessionRepo.hasUrlSet(['https://a.com', 'https://c.com'])).toBe(false);
  });

  it('keeps the hash current when tabs change', async () => {
    const s = await sessionEngine.createSession('S', [mkTab('https://a.com')]);
    await workspaceMembership.addTabs(s.id, [mkTab('https://b.com')]);
    expect(await sessionRepo.hasUrlSet(['https://a.com', 'https://b.com'])).toBe(true);
    expect(await sessionRepo.hasUrlSet(['https://a.com'])).toBe(false);
  });

  it('uses the index instead of scanning', async () => {
    for (let i = 0; i < 20; i++) await sessionEngine.createSession(`S${i}`, [mkTab(`https://site${i}.com`)]);
    expect(await db.sessions.where('urlHash').equals(hashUrlSet(['https://site7.com'])).count()).toBe(1);
  });
});

describe('workspaceMembership.addTabs', () => {
  it('does not lose a tab when two adds race (regression)', async () => {
    const s = await sessionEngine.createSession('S', [mkTab('https://a.com')]);
    await Promise.all([
      workspaceMembership.addTabs(s.id, [mkTab('https://b.com/1')]),
      workspaceMembership.addTabs(s.id, [mkTab('https://c.com/2')]),
      workspaceMembership.addTabs(s.id, [mkTab('https://d.com/3')]),
    ]);
    const urls = (await sessionEngine.getSessionById(s.id))!.tabs.map((t) => t.url).sort();
    expect(urls).toEqual(['https://a.com', 'https://b.com/1', 'https://c.com/2', 'https://d.com/3']);
    expect((await sessionEngine.getSessionById(s.id))!.tabCount).toBe(4);
  });

  it('skips duplicates and reports counts', async () => {
    const s = await sessionEngine.createSession('S', [mkTab('https://a.com')]);
    const res = await workspaceMembership.addTabs(s.id, [mkTab('https://a.com'), mkTab('https://b.com')]);
    expect(res.added).toBe(1);
    expect(res.skipped).toBe(1);
  });

  it('removeTab returns the tab and reindexes', async () => {
    const s = await sessionEngine.createSession('S', [mkTab('https://a.com'), mkTab('https://b.com', 1)]);
    const removed = await workspaceMembership.removeTab(s.id, 'https://a.com');
    expect(removed?.url).toBe('https://a.com');
    const left = (await sessionEngine.getSessionById(s.id))!.tabs;
    expect(left).toHaveLength(1);
    expect(left[0].index).toBe(0);
  });
});
