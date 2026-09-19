import { PepperSession, PepperTab } from '../types/session';
import { cleanUrlKey } from '../utils/url';
import { tabTokens, baseDomain } from './session-naming';
import { INBOX_SESSION_ID } from '../constants/ids';

export interface WorkspaceSuggestion {
  /** Stable key so a dismissed suggestion stays dismissed */
  key: string;
  kind: 'add' | 'create';
  workspaceId?: string;
  workspaceName?: string;
  topic: string;
  tabs: PepperTab[];
}

interface Options {
  /** Minimum tabs in a group before suggesting */
  minGroup?: number;
  dismissed?: ReadonlySet<string>;
}

function domainOf(url: string): string {
  try {
    return baseDomain(new URL(url).hostname);
  } catch {
    return '';
  }
}

function workspaceProfile(ws: PepperSession) {
  const words = new Map<string, number>();
  const domains = new Set<string>();
  for (const t of ws.tabs) {
    for (const w of tabTokens(t)) words.set(w, (words.get(w) || 0) + 1);
    const d = domainOf(t.url);
    if (d) domains.add(d);
  }
  for (const w of ws.name.toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length >= 3)) words.set(w, (words.get(w) || 0) + 2);
  return { words, domains };
}

/**
 * Looks at open tabs that are not in any workspace and proposes either adding
 * them to the workspace they resemble, or creating a new one around a shared topic.
 */
export function suggestFromTabs(openTabs: PepperTab[], workspaces: PepperSession[], opts: Options = {}): WorkspaceSuggestion[] {
  const minGroup = opts.minGroup ?? 3;
  const dismissed = opts.dismissed ?? new Set<string>();
  const real = workspaces.filter((w) => w.id !== INBOX_SESSION_ID);

  const saved = new Set<string>();
  for (const w of workspaces) for (const t of w.tabs) saved.add(cleanUrlKey(t.url));
  const free = openTabs.filter((t) => t.url && !saved.has(cleanUrlKey(t.url)));
  if (free.length < minGroup) return [];

  const profiles = real.map((w) => ({ ws: w, ...workspaceProfile(w) }));
  const assigned = new Map<string, PepperTab[]>();
  const leftover: PepperTab[] = [];

  for (const tab of free) {
    const tokens = tabTokens(tab);
    const domain = domainOf(tab.url);
    let best: { id: string; score: number } | null = null;
    for (const p of profiles) {
      let score = tokens.filter((t) => p.words.has(t)).length;
      if (domain && p.domains.has(domain)) score += 2;
      if (score >= 2 && (!best || score > best.score)) best = { id: p.ws.id, score };
    }
    if (best) assigned.set(best.id, [...(assigned.get(best.id) || []), tab]);
    else leftover.push(tab);
  }

  const out: WorkspaceSuggestion[] = [];
  for (const [id, tabs] of assigned) {
    if (tabs.length < minGroup) {
      leftover.push(...tabs);
      continue;
    }
    const ws = real.find((w) => w.id === id)!;
    out.push({ key: `add:${id}:${tabs.map((t) => cleanUrlKey(t.url)).sort().join('|')}`, kind: 'add', workspaceId: id, workspaceName: ws.name, topic: ws.name, tabs });
  }

  // New workspace: the word (or site) shared by the most leftover tabs
  const counts = new Map<string, PepperTab[]>();
  for (const tab of leftover) {
    const keys = new Set([...tabTokens(tab), domainOf(tab.url)].filter(Boolean));
    for (const k of keys) counts.set(k, [...(counts.get(k) || []), tab]);
  }
  const used = new Set<PepperTab>();
  for (const [word, tabs] of [...counts.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const group = tabs.filter((t) => !used.has(t));
    if (group.length < minGroup) continue;
    group.forEach((t) => used.add(t));
    const topic = word.includes('.') ? word.split('.')[0] : word;
    const title = topic.charAt(0).toUpperCase() + topic.slice(1);
    out.push({ key: `create:${word}:${group.map((t) => cleanUrlKey(t.url)).sort().join('|')}`, kind: 'create', topic: title, tabs: group });
  }

  return out.filter((s) => !dismissed.has(s.key));
}
