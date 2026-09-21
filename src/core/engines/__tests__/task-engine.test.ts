import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from './test-db';
import { db } from '../../../storage/db';
import { taskEngine, normalizeTaskTitle, cleanTaskUrl, sortTasks, openCountsByWorkspace, openTasks, MAX_TASK_TITLE } from '../task-engine';
import { PepperTask } from '../../types/task';

beforeEach(resetDb);

const mk = (over: Partial<PepperTask>): PepperTask => ({ id: 't', title: 'T', done: false, createdAt: 1, updatedAt: 1, ...over });

describe('task title and url cleaning', () => {
  it('collapses whitespace, trims and caps length', () => {
    expect(normalizeTaskTitle('  write   the\n docs ')).toBe('write the docs');
    expect(normalizeTaskTitle('x'.repeat(MAX_TASK_TITLE + 50))).toHaveLength(MAX_TASK_TITLE);
    expect(normalizeTaskTitle('   ')).toBe('');
  });

  it('keeps only http(s) links', () => {
    expect(cleanTaskUrl('https://a.com/x?y=1')).toBe('https://a.com/x?y=1');
    expect(cleanTaskUrl('javascript:alert(1)')).toBeUndefined();
    expect(cleanTaskUrl('chrome://settings')).toBeUndefined();
    expect(cleanTaskUrl(undefined)).toBeUndefined();
  });
});

describe('taskEngine', () => {
  it('adds a trimmed task and rejects an empty title', async () => {
    const t = await taskEngine.add({ title: '  Ship it  ', workspaceId: 'ws1', url: 'https://a.com' });
    expect(t).toMatchObject({ title: 'Ship it', done: false, workspaceId: 'ws1', url: 'https://a.com/' });
    expect(await taskEngine.add({ title: '   ' })).toBeNull();
    expect(await db.tasks.count()).toBe(1);
  });

  it('turns a tab into a task and refuses non-web pages', async () => {
    const t = await taskEngine.addFromTab({ title: 'Stripe docs', url: 'https://stripe.com/docs' }, 'ws1');
    expect(t).toMatchObject({ title: 'Stripe docs', url: 'https://stripe.com/docs', workspaceId: 'ws1' });
    expect(await taskEngine.addFromTab({ title: 'Settings', url: 'chrome://settings' })).toBeNull();
    expect(await db.tasks.count()).toBe(1);
  });

  it('sets done with a timestamp and reopens it cleanly', async () => {
    const t = (await taskEngine.add({ title: 'A' }))!;
    const done = await taskEngine.setDone(t.id, true);
    expect(done?.done).toBe(true);
    expect(done?.doneAt).toBeGreaterThan(0);
    const reopened = await taskEngine.setDone(t.id, false);
    expect(reopened?.done).toBe(false);
    expect(reopened?.doneAt).toBeUndefined();
    expect(await taskEngine.setDone('missing', true)).toBeUndefined();
  });

  it('removes a task and restores it on undo', async () => {
    const t = (await taskEngine.add({ title: 'A' }))!;
    const removed = await taskEngine.remove(t.id);
    expect(await db.tasks.count()).toBe(0);
    await taskEngine.restore(removed!);
    expect((await db.tasks.get(t.id))?.title).toBe('A');
  });

  it('lists a workspace\'s tasks only', async () => {
    await taskEngine.add({ title: 'in', workspaceId: 'ws1' });
    await taskEngine.add({ title: 'out', workspaceId: 'ws2' });
    await taskEngine.add({ title: 'none' });
    expect((await taskEngine.listForWorkspace('ws1')).map((t) => t.title)).toEqual(['in']);
  });

  it('rename ignores an empty title', async () => {
    const t = (await taskEngine.add({ title: 'Keep' }))!;
    await taskEngine.rename(t.id, '   ');
    expect((await taskEngine.get(t.id))?.title).toBe('Keep');
    await taskEngine.rename(t.id, ' New ');
    expect((await taskEngine.get(t.id))?.title).toBe('New');
  });
});

describe('task helpers', () => {
  it('sorts open oldest-first, then done newest-first', () => {
    const sorted = sortTasks([
      mk({ id: 'd1', done: true, doneAt: 10 }),
      mk({ id: 'o2', createdAt: 5 }),
      mk({ id: 'd2', done: true, doneAt: 20 }),
      mk({ id: 'o1', createdAt: 2 }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(['o1', 'o2', 'd2', 'd1']);
  });

  it('counts only open tasks per workspace', () => {
    const counts = openCountsByWorkspace([
      mk({ id: 'a', workspaceId: 'w1' }),
      mk({ id: 'b', workspaceId: 'w1' }),
      mk({ id: 'c', workspaceId: 'w1', done: true }),
      mk({ id: 'd', workspaceId: 'w2' }),
      mk({ id: 'e' }),
    ]);
    expect(counts.get('w1')).toBe(2);
    expect(counts.get('w2')).toBe(1);
    expect(counts.size).toBe(2);
  });

  it('openTasks filters by workspace, or returns every open task when none is given', () => {
    const all = [mk({ id: 'a', workspaceId: 'w1' }), mk({ id: 'b' }), mk({ id: 'c', done: true, workspaceId: 'w1' })];
    expect(openTasks(all).map((t) => t.id)).toEqual(['a', 'b']);
    expect(openTasks(all, 'w1').map((t) => t.id)).toEqual(['a']);
    expect(openTasks(all, null).map((t) => t.id)).toEqual(['b']);
  });
});
