import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetDb, mkTab } from './test-db';
import { sessionEngine } from '../session-engine';
import { restoreEngine, shouldRestoreLazily, LAZY_RESTORE_THRESHOLD } from '../restore-engine';

describe('shouldRestoreLazily', () => {
  it('is lazy only above the threshold and when enabled', () => {
    expect(shouldRestoreLazily(LAZY_RESTORE_THRESHOLD, true)).toBe(false);
    expect(shouldRestoreLazily(LAZY_RESTORE_THRESHOLD + 1, true)).toBe(true);
    expect(shouldRestoreLazily(40, false)).toBe(false);
  });
  it('honors an explicit override', () => {
    expect(shouldRestoreLazily(2, true, true)).toBe(true);
    expect(shouldRestoreLazily(40, true, false)).toBe(false);
  });
});

describe('restoreEngine.restoreSession', () => {
  let nextId = 1;
  const created: Array<{ url: string; index: number }> = [];
  const discard = vi.fn(async () => undefined);

  beforeEach(async () => {
    await resetDb();
    created.length = 0;
    discard.mockClear();
    nextId = 1;
    vi.stubGlobal('chrome', {
      windows: { create: vi.fn(async ({ url }: { url: string }) => { created.push({ url, index: 0 }); return { id: 9, tabs: [{ id: 100 }] }; }) },
      tabs: {
        query: vi.fn(async () => [{ id: 100 }]),
        update: vi.fn(),
        create: vi.fn(async (o: { url: string; index: number }) => { created.push({ url: o.url, index: o.index }); return { id: 200 + nextId++ }; }),
        discard,
      },
      storage: { local: { get: vi.fn(async () => ({})), set: vi.fn(async () => undefined) } },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const big = (n: number) => Array.from({ length: n }, (_, i) => mkTab(`https://site${i}.com`, i));

  it('restores all tabs and discards none for a small workspace', async () => {
    const s = await sessionEngine.createSession('Small', big(3));
    await restoreEngine.restoreSession(s.id);
    expect(created).toHaveLength(3);
    expect(discard).not.toHaveBeenCalled();
  });

  it('discards every background tab, but not the first, for a 40-tab workspace', async () => {
    const s = await sessionEngine.createSession('Big', big(40));
    await restoreEngine.restoreSession(s.id);
    expect(created).toHaveLength(40);
    expect(discard).toHaveBeenCalledTimes(39);
  });

  it('can be forced eager', async () => {
    const s = await sessionEngine.createSession('Big', big(40));
    await restoreEngine.restoreSession(s.id, undefined, { lazy: false });
    expect(discard).not.toHaveBeenCalled();
  });

  it('restores only the selected tabs', async () => {
    const s = await sessionEngine.createSession('Some', big(5));
    await restoreEngine.restoreSession(s.id, [1, 3]);
    expect(created.map((c) => c.url).sort()).toEqual(['https://site1.com', 'https://site3.com']);
  });

  it('throws for a missing workspace', async () => {
    await expect(restoreEngine.restoreSession('nope')).rejects.toThrow(/not found/);
  });
});
