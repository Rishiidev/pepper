/** Text helpers behind local search: tokenizing, stemming, typo tolerance, time phrases. No AI, no network. */

const QUERY_STOPWORDS = new Set(
  ('a an the and or of to in on at for from with about that this those these my me i was were is are be been am ' +
    'working worked looking looked reading read thing things stuff some any it its find show open where what when ' +
    'tabs tab window windows session sessions workspace workspaces last recent recently previous earlier old').split(' ')
);

/** Words that mean roughly the same thing when someone tries to recall work. */
const SYNONYM_GROUPS: string[][] = [
  ['price', 'pricing', 'cost', 'costs', 'plan', 'plans', 'billing', 'subscription'],
  ['buy', 'purchase', 'checkout', 'cart', 'order', 'shop', 'shopping'],
  ['bug', 'error', 'issue', 'issues', 'fix', 'debug', 'debugging', 'exception', 'crash'],
  ['doc', 'docs', 'documentation', 'guide', 'manual', 'reference', 'tutorial'],
  ['design', 'ui', 'ux', 'mockup', 'wireframe', 'figma'],
  ['code', 'coding', 'dev', 'development', 'programming', 'developer'],
  ['meeting', 'call', 'standup', 'sync', 'zoom', 'meet'],
  ['email', 'mail', 'inbox', 'gmail', 'outlook'],
  ['job', 'jobs', 'hiring', 'career', 'careers', 'interview', 'resume'],
  ['travel', 'trip', 'flight', 'flights', 'hotel', 'vacation', 'booking'],
  ['learn', 'learning', 'course', 'courses', 'tutorial', 'lesson', 'study'],
  ['competitor', 'competitors', 'competition', 'alternative', 'alternatives', 'comparison', 'compare'],
  ['analytics', 'metrics', 'stats', 'statistics', 'dashboard', 'report', 'reports'],
  ['ad', 'ads', 'advertising', 'campaign', 'campaigns', 'marketing'],
  ['auth', 'login', 'signin', 'authentication', 'oauth', 'password'],
  ['deploy', 'deployment', 'hosting', 'release', 'production'],
  ['ai', 'llm', 'gpt', 'chatgpt', 'claude', 'openai', 'model'],
];

const SYNONYMS: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const group of SYNONYM_GROUPS) {
    for (const w of group) map.set(w, [...(map.get(w) || []), ...group.filter((g) => g !== w)]);
  }
  return map;
})();

export function synonymsOf(word: string): string[] {
  return SYNONYMS.get(word) ?? SYNONYMS.get(stem(word)) ?? [];
}

/** Very small suffix stripper; good enough to equate "pricing"/"prices"/"priced". */
export function stem(word: string): string {
  let w = word;
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 4 && /(s|x|z|ch|sh)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  return w;
}

/** Splits text into lowercase alphanumeric words. */
export function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** Optimal-string-alignment distance (insert, delete, substitute, adjacent swap). */
export function editDistance(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2: number[] = [];
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, (prev2[j - 2] ?? Infinity) + 1);
      }
      cur[j] = v;
    }
    prev2.length = 0;
    prev2.push(...prev);
    prev = cur;
  }
  return prev[b.length];
}

/** True if every character of `q` appears in `w` in order and the first letters agree ("shpfy" ~ "shopify"). */
export function isAbbreviation(q: string, w: string): boolean {
  if (q.length < 3 || q[0] !== w[0] || q.length >= w.length) return false;
  let i = 0;
  for (const ch of w) if (ch === q[i]) i++;
  return i === q.length;
}

/**
 * How well one query word matches one field word, 0..1.
 * exact > stem > prefix > substring > synonym > typo > abbreviation.
 */
export function wordMatch(q: string, w: string): number {
  if (q === w) return 1;
  if (stem(q) === stem(w)) return 0.9;
  if (q.length >= 2 && w.startsWith(q)) return 0.85;
  if (q.length >= 3 && w.includes(q)) return 0.6;
  if (q.length >= 4) {
    const max = q.length >= 7 ? 2 : 1;
    const d = editDistance(q, w, max);
    if (d <= max) return 0.75 - 0.15 * d;
    // typo against the prefix of a longer word: "pricng" vs "pricing"
    if (w.length > q.length) {
      const dp = editDistance(q, w.slice(0, q.length), max);
      if (dp <= max) return 0.6 - 0.1 * dp;
    }
  }
  if (isAbbreviation(q, w)) return 0.4;
  return 0;
}

export interface TimeRange {
  from: number;
  to: number;
}

const DAY = 86_400_000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface ParsedQuery {
  tokens: string[];
  time?: TimeRange;
}

/**
 * Turns "that pricing research from last week" into content words plus a time range.
 * Stopwords are dropped unless that would leave nothing to search.
 */
export function parseQuery(query: string, now = Date.now()): ParsedQuery {
  let text = ` ${query.toLowerCase().trim()} `;
  let time: TimeRange | undefined;
  const today = startOfDay(now);

  const take = (re: RegExp, range: (m: RegExpMatchArray) => TimeRange) => {
    const m = text.match(re);
    if (m && !time) {
      time = range(m);
      text = text.replace(re, ' ');
    }
  };

  take(/\s(\d+)\s+days?\s+ago\s/, (m) => ({ from: today - Number(m[1]) * DAY, to: today - (Number(m[1]) - 1) * DAY }));
  take(/\slast\s+week\s/, () => ({ from: today - 14 * DAY, to: today - 6 * DAY }));
  take(/\sthis\s+week\s/, () => ({ from: today - 6 * DAY, to: now + DAY }));
  take(/\slast\s+month\s/, () => ({ from: today - 62 * DAY, to: today - 20 * DAY }));
  take(/\sthis\s+month\s/, () => ({ from: today - 30 * DAY, to: now + DAY }));
  take(/\syesterday\s/, () => ({ from: today - DAY, to: today }));
  take(/\stoday\s/, () => ({ from: today, to: now + DAY }));

  const all = words(text);
  const content = all.filter((w) => !QUERY_STOPWORDS.has(w));
  const tokens = content.length > 0 ? content : time ? [] : all;
  return { tokens, time };
}
