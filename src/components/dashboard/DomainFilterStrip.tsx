import React from 'react';
import { PepperSession } from '../../core/types/session';
import { Globe } from 'lucide-react';

interface Props {
  sessions: PepperSession[];
  activeSearchQuery: string;
  onSelectDomain: (domain: string) => void;
}

export const DomainFilterStrip: React.FC<Props> = ({ sessions, activeSearchQuery, onSelectDomain }) => {
  // Aggregate top domains across all saved workspaces
  const domainCounts = new Map<string, number>();

  for (const session of sessions) {
    for (const tab of session.tabs) {
      try {
        const host = new URL(tab.url).hostname.replace(/^www\./, '');
        if (host && !host.includes('chrome')) {
          domainCounts.set(host, (domainCounts.get(host) || 0) + 1);
        }
      } catch {
        // Ignore invalid URLs
      }
    }
  }

  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (topDomains.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1 shrink-0">
        <Globe className="w-3 h-3 text-pepper-500" />
        <span>Top Domains:</span>
      </span>

      {topDomains.map(([domain, count]) => {
        const isActive = activeSearchQuery.toLowerCase() === domain.toLowerCase();
        return (
          <button
            key={domain}
            onClick={() => onSelectDomain(isActive ? '' : domain)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors shrink-0 flex items-center gap-1 border ${
              isActive
                ? 'bg-pepper-500 text-white border-pepper-500'
                : 'bg-surface-card border-border/80 text-text-secondary hover:text-text-primary hover:border-border'
            }`}
          >
            <span>{domain}</span>
            <span className="text-[10px] opacity-70">({count})</span>
          </button>
        );
      })}
    </div>
  );
};
