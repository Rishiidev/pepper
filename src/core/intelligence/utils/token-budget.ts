export const AI_LIMITS = {
  workspaceTitle: 32,
  tags: 64,
  projects: 32,
  summary: 180,
  related: 120,
  merge: 100,
  semanticSearch: 150,
  ocr: 300,
};

export class TokenBudgetEstimator {
  static estimateCost(feature: keyof typeof AI_LIMITS | string, outputTokens: number): { costStr: string; outputTokens: number } {
    const limits = AI_LIMITS as Record<string, number>;
    const maxTokens = limits[feature] || 250;

    // Average cost estimation ($0.00015 per 1K tokens input, $0.0006 per 1K output)
    const estimatedCost = (outputTokens / 1000) * 0.0006;
    let costStr = '< $0.001';
    if (estimatedCost >= 0.001) {
      costStr = `$${estimatedCost.toFixed(4)}`;
    }

    return {
      costStr,
      outputTokens: Math.min(outputTokens, maxTokens),
    };
  }

  /**
   * Intelligently compresses a large list of tabs into a summary domain and key title representation
   * to keep prompts extremely compact and fit within standard context budgets.
   */
  static compressTabs(tabs: Array<{ title?: string; url?: string }>): Array<{ title: string; domain: string }> {
    if (!tabs || tabs.length === 0) return [];

    // Group tabs by base domain
    const groups: Record<string, Array<{ title: string; url: string }>> = {};
    for (const tab of tabs) {
      if (!tab.url) continue;
      try {
        const domain = new URL(tab.url).hostname.replace(/^www\./, '');
        if (!groups[domain]) groups[domain] = [];
        groups[domain].push({
          title: tab.title || 'Untitled',
          url: tab.url,
        });
      } catch {
        // Safe skip
      }
    }

    const compressed: Array<{ title: string; domain: string }> = [];

    // Compress domains with 3+ tabs
    for (const [domain, tabList] of Object.entries(groups)) {
      if (tabList.length >= 3) {
        // Select top 2 unique keywords or titles from the group
        const keywords = Array.from(
          new Set(
            tabList
              .map((t) => t.title.split(/[-|–]/)[0].trim())
              .filter((k) => k.length > 2 && !k.toLowerCase().includes('http'))
          )
        ).slice(0, 3);

        for (const kw of keywords) {
          compressed.push({ title: kw, domain });
        }
      } else {
        for (const t of tabList) {
          compressed.push({
            title: t.title.split(/[-|–]/)[0].trim(),
            domain,
          });
        }
      }
    }

    // Hard limit to max 15 compressed tab nodes to keep context clean
    return compressed.slice(0, 15);
  }
}
