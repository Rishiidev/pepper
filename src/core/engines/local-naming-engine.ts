import { PepperTab } from '../types/session';

interface DomainCategory {
  category: string;
  actionWord: string;
  domains: string[];
}

const CATEGORIES: DomainCategory[] = [
  {
    category: 'E-commerce & Shopping',
    actionWord: 'Research',
    domains: ['shopify.com', 'amazon.com', 'stripe.com', 'ebay.com', 'etsy.com', 'walmart.com'],
  },
  {
    category: 'Development',
    actionWord: 'Engineering Session',
    domains: ['github.com', 'gitlab.com', 'stackoverflow.com', 'npmjs.com', 'localhost', 'dev.to'],
  },
  {
    category: 'Design & Creative',
    actionWord: 'Design Session',
    domains: ['figma.com', 'dribbble.com', 'behance.net', 'canva.com', 'unsplash.com', 'adobe.com'],
  },
  {
    category: 'Productivity & Docs',
    actionWord: 'Documentation',
    domains: ['docs.google.com', 'notion.so', 'linear.app', 'slack.com', 'trello.com', 'jira.com'],
  },
  {
    category: 'AI & Machine Learning',
    actionWord: 'AI Exploration',
    domains: ['chatgpt.com', 'openai.com', 'claude.ai', 'huggingface.co', 'anthropic.com'],
  },
  {
    category: 'Media & Video',
    actionWord: 'Watch & Media',
    domains: ['youtube.com', 'vimeo.com', 'netflix.com', 'spotify.com', 'twitch.tv'],
  },
];

export class LocalNamingEngine {
  /**
   * Deterministically generates a rich, contextual workspace name from tab metadata
   */
  generateFallbackTitle(tabs: PepperTab[]): { title: string; tags: string[]; category: string } {
    if (!tabs || tabs.length === 0) {
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { title: `Pepper Workspace (${today})`, tags: ['Workspace'], category: 'General' };
    }

    // Single tab case
    if (tabs.length === 1) {
      const cleanTitle = (tabs[0].title || '').replace(/\s*[-–|].*$/, '').trim();
      const domain = this.extractHostname(tabs[0].url);
      const title = cleanTitle || (domain ? `${this.capitalize(domain)} Page` : 'Saved Workspace');
      return {
        title: title,
        tags: [domain || 'Web'].filter(Boolean),
        category: 'Single Tab',
      };
    }

    // Multi-tab domain distribution analysis
    const domainCounts: Record<string, number> = {};
    const domainsList: string[] = [];

    for (const tab of tabs) {
      const dom = this.extractHostname(tab.url);
      if (dom) {
        domainsList.push(dom);
        domainCounts[dom] = (domainCounts[dom] || 0) + 1;
      }
    }

    // Sort domains by frequency
    const sortedDomains = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]);
    const dominantDomain = sortedDomains[0] ? sortedDomains[0][0] : '';
    const dominantCount = sortedDomains[0] ? dominantSortedCount(sortedDomains[0][1], tabs.length) : 0;

    // Check category match
    for (const cat of CATEGORIES) {
      const matchedCount = domainsList.filter((d) => cat.domains.some((cd) => d.includes(cd))).length;
      if (matchedCount >= 2 || (tabs.length <= 3 && matchedCount >= 1)) {
        const topBrand = dominantDomain ? this.capitalize(dominantDomain.split('.')[0]) : cat.category;
        return {
          title: `${topBrand} ${cat.actionWord}`,
          tags: [topBrand, cat.category.split(' ')[0]],
          category: cat.category,
        };
      }
    }

    // Dominant single domain (>40% of tabs)
    if (dominantDomain && dominantCount >= 0.4) {
      const brand = this.capitalize(dominantDomain.split('.')[0]);
      return {
        title: `${brand} Workspace (${tabs.length} tabs)`,
        tags: [brand, 'Research'],
        category: 'Domain Cluster',
      };
    }

    // Mixed multi-domain fallback
    const activeTab = tabs.find((t) => t.pinned) || tabs[0];
    const cleanActiveTitle = (activeTab?.title || '').replace(/\s*[-–|].*$/, '').trim();
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (cleanActiveTitle && cleanActiveTitle.length < 35) {
      return {
        title: `${cleanActiveTitle} & Related Tabs`,
        tags: ['Multi-tab', 'Workspace'],
        category: 'Mixed Context',
      };
    }

    return {
      title: `Workspace (${tabs.length} tabs • ${todayStr})`,
      tags: ['Browser Workspace'],
      category: 'General',
    };
  }

  private extractHostname(url?: string): string {
    if (!url) return '';
    try {
      return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return '';
    }
  }

  private capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

function dominantSortedCount(count: number, total: number): number {
  return count / (total || 1);
}

export const localNamingEngine = new LocalNamingEngine();
