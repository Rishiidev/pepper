import { PepperTab } from '../types/session';

/** Registrable domain → what the user was probably doing there. */
const DOMAIN_INTENTS: Record<string, string> = {
  // Development
  'github.com': 'Development', 'gitlab.com': 'Development', 'bitbucket.org': 'Development',
  'stackoverflow.com': 'Debugging', 'stackexchange.com': 'Debugging', 'npmjs.com': 'Development',
  'pypi.org': 'Development', 'crates.io': 'Development', 'pkg.go.dev': 'Development',
  'developer.mozilla.org': 'Web Development', 'mozilla.org': 'Web Development', 'w3schools.com': 'Web Development',
  'codepen.io': 'Prototyping', 'codesandbox.io': 'Prototyping', 'replit.com': 'Prototyping',
  'stackblitz.com': 'Prototyping', 'jsfiddle.net': 'Prototyping', 'dev.to': 'Reading',
  'localhost': 'Local Development', 'vercel.com': 'Deployment', 'netlify.com': 'Deployment',
  'cloudflare.com': 'Infrastructure', 'aws.amazon.com': 'Cloud', 'console.aws.amazon.com': 'Cloud',
  'azure.com': 'Cloud', 'digitalocean.com': 'Infrastructure', 'heroku.com': 'Deployment',
  'supabase.com': 'Backend', 'firebase.google.com': 'Backend', 'railway.app': 'Deployment',
  'docker.com': 'Infrastructure', 'kubernetes.io': 'Infrastructure', 'sentry.io': 'Monitoring',
  'datadoghq.com': 'Monitoring', 'grafana.com': 'Monitoring', 'postman.com': 'API Testing',
  'swagger.io': 'API Design', 'react.dev': 'Web Development', 'nextjs.org': 'Web Development',
  'vuejs.org': 'Web Development', 'svelte.dev': 'Web Development', 'tailwindcss.com': 'Web Development',
  'typescriptlang.org': 'Development', 'nodejs.org': 'Development', 'python.org': 'Development',
  'rust-lang.org': 'Development', 'go.dev': 'Development', 'leetcode.com': 'Practice',
  'hackerrank.com': 'Practice', 'chrome.com': 'Web Development', 'web.dev': 'Web Development',
  // AI
  'openai.com': 'AI Research', 'chatgpt.com': 'AI Research', 'anthropic.com': 'AI Research',
  'claude.ai': 'AI Research', 'gemini.google.com': 'AI Research', 'huggingface.co': 'AI Research',
  'perplexity.ai': 'AI Research', 'arxiv.org': 'Research Papers', 'kaggle.com': 'Data Science',
  // Design
  'figma.com': 'Design', 'dribbble.com': 'Design Inspiration', 'behance.net': 'Design Inspiration',
  'canva.com': 'Design', 'framer.com': 'Design', 'webflow.com': 'Site Building', 'unsplash.com': 'Design Assets',
  'pinterest.com': 'Inspiration', 'awwwards.com': 'Design Inspiration', 'adobe.com': 'Design',
  // Work / productivity
  'notion.so': 'Planning', 'linear.app': 'Planning', 'trello.com': 'Planning', 'asana.com': 'Planning',
  'atlassian.net': 'Project Management', 'jira.com': 'Project Management', 'clickup.com': 'Planning',
  'airtable.com': 'Planning', 'docs.google.com': 'Documents', 'sheets.google.com': 'Spreadsheets',
  'drive.google.com': 'Files', 'calendar.google.com': 'Scheduling', 'mail.google.com': 'Email',
  'outlook.com': 'Email', 'slack.com': 'Communication', 'discord.com': 'Communication',
  'zoom.us': 'Meetings', 'meet.google.com': 'Meetings', 'teams.microsoft.com': 'Meetings',
  'miro.com': 'Brainstorming', 'loom.com': 'Video Updates', 'hubspot.com': 'CRM', 'salesforce.com': 'CRM',
  // Commerce / finance
  'shopify.com': 'E-commerce', 'myshopify.com': 'E-commerce', 'stripe.com': 'Payments',
  'paypal.com': 'Payments', 'amazon.com': 'Shopping', 'ebay.com': 'Shopping', 'etsy.com': 'Shopping',
  'walmart.com': 'Shopping', 'aliexpress.com': 'Shopping', 'quickbooks.com': 'Accounting',
  'coinbase.com': 'Crypto', 'tradingview.com': 'Markets',
  // Marketing / analytics
  'analytics.google.com': 'Analytics', 'ads.google.com': 'Advertising', 'facebook.com': 'Social',
  'business.facebook.com': 'Advertising', 'mailchimp.com': 'Email Marketing', 'semrush.com': 'SEO',
  'ahrefs.com': 'SEO', 'search.google.com': 'SEO',
  // Learning / media / reading
  'youtube.com': 'Learning', 'coursera.org': 'Learning', 'udemy.com': 'Learning', 'khanacademy.org': 'Learning',
  'edx.org': 'Learning', 'wikipedia.org': 'Research', 'medium.com': 'Reading', 'substack.com': 'Reading',
  'news.ycombinator.com': 'Tech News', 'reddit.com': 'Research', 'quora.com': 'Research',
  'twitter.com': 'Social', 'x.com': 'Social', 'linkedin.com': 'Networking', 'instagram.com': 'Social',
  'tiktok.com': 'Social', 'netflix.com': 'Entertainment', 'spotify.com': 'Music', 'twitch.tv': 'Streaming',
  // Travel
  'booking.com': 'Travel Planning', 'airbnb.com': 'Travel Planning', 'expedia.com': 'Travel Planning',
  'skyscanner.com': 'Travel Planning', 'tripadvisor.com': 'Travel Planning', 'maps.google.com': 'Travel Planning',
};

const STOPWORDS = new Set(
  ('a an and are as at be by for from has have how i in is it its of on or that the this to was what when where which who why will with you your ' +
    'new home page pages welcome login log sign signin signup untitled tab dashboard overview getting started guide docs documentation ' +
    'official free online best top vs about into out up all more not can get one two use using used via').split(' ')
);

const TITLE_SEPARATORS = /\s+[-–—|·•:]\s+/;

/** Registrable-ish domain: keeps known multi-part hosts (docs.google.com) matchable. */
export function baseDomain(hostname: string): string {
  const host = hostname.replace(/^www\./, '').toLowerCase();
  if (DOMAIN_INTENTS[host]) return host;
  const parts = host.split('.');
  if (parts.length > 2) {
    const tail3 = parts.slice(-3).join('.');
    if (DOMAIN_INTENTS[tail3]) return tail3;
  }
  return parts.slice(-2).join('.');
}

export function intentForDomain(domain: string): string | undefined {
  return DOMAIN_INTENTS[domain] ?? DOMAIN_INTENTS[domain.split('.').slice(-2).join('.')];
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/** Drops the "- Site Name" suffix so only the page-specific part of a title remains. */
export function cleanTitle(title: string, host = ''): string {
  const parts = (title || '').split(TITLE_SEPARATORS).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  const brand = baseDomain(host).split('.')[0];
  const specific = parts.filter((p) => p.toLowerCase().replace(/[^a-z0-9]/g, '') !== brand);
  return (specific[0] ?? parts[0]).trim();
}

function tokenize(text: string, brands: Set<string>): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((w) => w.replace(/^\.+|\.+$/g, ''))
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w) && !brands.has(w));
}

function titleCase(words: string[]): string {
  return words.map((w) => (w.length <= 3 && /^[a-z]+$/.test(w) && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}

/** Meaningful words for one tab: title words plus its site name. Used to match tabs to workspaces. */
export function tabTokens(tab: PepperTab, opts: { brand?: boolean } = {}): string[] {
  const host = hostOf(tab.url);
  const brand = host ? baseDomain(host).split('.')[0] : '';
  const tokens = tokenize(cleanTitle(tab.title, host), new Set());
  const withBrand = opts.brand !== false && brand.length >= 3;
  return [...new Set(withBrand ? [...tokens, brand] : tokens)];
}

/** The one or two words that recur across tab titles (e.g. "stripe webhooks"). */
export function extractTopic(tabs: PepperTab[], activeTabIndex = 0): string {
  const brands = new Set<string>();
  const docs: string[][] = [];
  for (const t of tabs) {
    const host = hostOf(t.url);
    if (host) {
      for (const part of baseDomain(host).split('.')) brands.add(part);
    }
  }
  for (const t of tabs) docs.push(tokenize(cleanTitle(t.title, hostOf(t.url)), brands));

  const uni = new Map<string, number>();
  const bi = new Map<string, number>();
  for (const words of docs) {
    for (const w of new Set(words)) uni.set(w, (uni.get(w) || 0) + 1);
    for (const b of new Set(words.slice(1).map((w, i) => `${words[i]} ${w}`))) bi.set(b, (bi.get(b) || 0) + 1);
  }

  const bestBi = [...bi.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0];
  if (bestBi) return titleCase(bestBi[0].split(' '));

  const shared = [...uni.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 2)
    .map(([w]) => w);
  if (shared.length) return titleCase(shared);

  // Nothing recurs: describe the tab the user was on.
  const focus = tabs[Math.min(activeTabIndex, tabs.length - 1)];
  if (focus) {
    const words = tokenize(cleanTitle(focus.title, hostOf(focus.url)), brands).slice(0, 3);
    if (words.length) return titleCase(words);
  }
  return '';
}

function truncate(s: string, max = 48): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Names a workspace from what it actually contains: the topic shared by its
 * page titles plus the kind of work its domains suggest.
 *   "Stripe Webhooks · Development"
 */
export function generateSessionName(tabs: PepperTab[], clusters: string[], activeTabIndex = 0): string {
  const intents: string[] = [];
  for (const domain of clusters.slice(0, 4)) {
    const intent = intentForDomain(domain);
    if (intent && !intents.includes(intent)) intents.push(intent);
  }

  const topic = extractTopic(tabs, activeTabIndex);

  if (topic && intents.length) return truncate(`${topic} · ${intents[0]}`);
  if (topic) return truncate(topic);
  if (intents.length >= 2) return truncate(`${intents[0]} & ${intents[1]}`);
  if (intents.length === 1) return truncate(`${intents[0]} Session`);

  if (clusters.length > 0) {
    const primary = clusters[0].split('.')[0];
    return truncate(`${primary.charAt(0).toUpperCase()}${primary.slice(1)} — ${tabs.length} tabs`);
  }

  const hour = new Date().getHours();
  return `${hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'} Workspace`;
}
