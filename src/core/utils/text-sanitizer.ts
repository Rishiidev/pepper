export function sanitizeDisplayTitle(name?: string, tabs?: Array<{ title?: string; url?: string }>): string {
  if (!name || typeof name !== 'string') return 'Active Workspace';

  let cleaned = name.trim();

  // Strip Markdown images ![alt](url) and links [text](url)
  cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, '');
  cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, '$1');

  // Strip URLs & HTML tags
  cleaned = cleaned.replace(/https?:\/\/\S+/gi, '');
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // Strip conversational preambles
  cleaned = cleaned.replace(/^(here's|here is|sure|this is|workspace|summary of|a summary of|collection of|list of|tabs open|open tabs|active workspace).*?:/gi, '');
  cleaned = cleaned.replace(/^(here's|here is|sure|this is|workspace|summary of|a summary of).*?\b(title|summary|overview|tabs|pages)\b/gi, '');

  // Strip markdown symbols and numbers at start
  cleaned = cleaned.replace(/^[\*\#\`"'\d\.\-\s:]+/, '').replace(/[\*\#\`"']/g, '').trim();

  // Check if output is a tab dump or too long
  if (
    cleaned.length > 45 ||
    cleaned.toLowerCase().includes('favicon') ||
    cleaned.toLowerCase().includes('url:') ||
    cleaned.toLowerCase().includes('google meet') ||
    cleaned.toLowerCase().includes('youtube') && cleaned.length > 30
  ) {
    if (tabs && tabs.length > 0) {
      const topDomains = Array.from(
        new Set(
          tabs
            .map((t) => {
              try {
                return new URL(t.url || '').hostname.replace(/^www\./, '').split('.')[0];
              } catch {
                return '';
              }
            })
            .filter(Boolean)
        )
      ).slice(0, 2);

      if (topDomains.length >= 2) {
        const d1 = topDomains[0].charAt(0).toUpperCase() + topDomains[0].slice(1);
        const d2 = topDomains[1].charAt(0).toUpperCase() + topDomains[1].slice(1);
        return `${d1} & ${d2}`;
      } else if (topDomains.length === 1) {
        const d1 = topDomains[0].charAt(0).toUpperCase() + topDomains[0].slice(1);
        return `${d1} Workspace`;
      }
    }
    return 'Active Workspace';
  }

  return cleaned || 'Active Workspace';
}

export function sanitizeDisplaySummary(summary?: string, tabCount: number = 0, projectName?: string): string {
  const fallback = `Contains ${tabCount} active browser tabs related to ${projectName || 'general tasks'}. Restore instantly to resume your exact workspace flow.`;
  if (!summary || typeof summary !== 'string') return fallback;

  let cleaned = summary.trim();

  // Strip Markdown images ![alt](url) and links [text](url)
  cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, '');
  cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, '$1');

  // Strip URLs & HTML tags
  cleaned = cleaned.replace(/https?:\/\/\S+/gi, '');
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // Strip conversational preambles
  cleaned = cleaned.replace(/^(here's|here is|sure|summary:?|overview:?)/gi, '').trim();

  // Take the first line/paragraph
  const firstLine = cleaned.split('\n').filter((l) => l.trim().length > 0)[0] || '';
  let result = firstLine.replace(/^[\*\#\`>\s\d\.-]+/g, '').replace(/\s+/g, ' ').trim();

  if (!result || result.length < 10 || result.toLowerCase().includes('favicon')) {
    return fallback;
  }

  if (result.length > 180) {
    result = result.substring(0, 177).trim() + '...';
  }

  return result;
}
