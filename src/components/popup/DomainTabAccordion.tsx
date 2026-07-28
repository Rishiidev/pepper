import React, { useState } from 'react';
import { PepperTab } from '../../core/types/session';
import { ChevronDown, ChevronUp, Globe } from 'lucide-react';

interface Props {
  tabs: PepperTab[];
  selectedIndices: Set<number>;
  onToggleIndex: (index: number) => void;
  onToggleDomain: (domainTabsIndices: number[], select: boolean) => void;
}

interface DomainGroup {
  domain: string;
  favIconUrl: string;
  indices: number[];
  tabs: PepperTab[];
}

export const DomainTabAccordion: React.FC<Props> = ({
  tabs,
  selectedIndices,
  onToggleIndex,
  onToggleDomain,
}) => {
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set());

  // Group tabs by domain hostname
  const groupsMap = new Map<string, DomainGroup>();

  tabs.forEach((tab, index) => {
    let domain = 'Other';
    try {
      if (tab.url) {
        domain = new URL(tab.url).hostname.replace(/^www\./, '');
      }
    } catch {
      domain = 'Other';
    }

    if (!groupsMap.has(domain)) {
      groupsMap.set(domain, {
        domain,
        favIconUrl: tab.favIconUrl || '',
        indices: [],
        tabs: [],
      });
    }

    const group = groupsMap.get(domain)!;
    group.indices.push(index);
    group.tabs.push(tab);
  });

  const domainGroups = Array.from(groupsMap.values());

  const toggleCollapse = (domain: string) => {
    const next = new Set(collapsedDomains);
    if (next.has(domain)) next.delete(domain);
    else next.add(domain);
    setCollapsedDomains(next);
  };

  return (
    <div className="space-y-2">
      {domainGroups.map((group) => {
        const isCollapsed = collapsedDomains.has(group.domain);
        const selectedCount = group.indices.filter((i) => selectedIndices.has(i)).length;
        const allSelected = selectedCount === group.indices.length;
        const someSelected = selectedCount > 0 && !allSelected;
        const groupRamMb = selectedCount * 125;

        return (
          <div
            key={group.domain}
            className="border border-border/70 rounded-xl bg-surface-card overflow-hidden transition-colors shadow-sm"
          >
            {/* Domain Group Header */}
            <div className="flex items-center justify-between p-2.5 bg-surface/60 hover:bg-surface-hover text-xs font-semibold select-none">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => onToggleDomain(group.indices, e.target.checked)}
                  className="accent-pepper-500 w-3.5 h-3.5 rounded cursor-pointer shrink-0"
                />
                {group.favIconUrl ? (
                  <img
                    src={group.favIconUrl}
                    alt=""
                    className="w-4 h-4 rounded object-cover shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/icons/icon-16.png';
                    }}
                  />
                ) : (
                  <Globe className="w-4 h-4 text-text-muted shrink-0" />
                )}
                <span className="truncate text-text-primary font-bold">{group.domain}</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                  {groupRamMb} MB
                </span>
                <span className="text-[10px] font-medium text-text-muted px-1.5 py-0.2 rounded bg-surface border border-border/50 shrink-0">
                  {selectedCount}/{group.tabs.length} tabs
                </span>
              </div>

              <button
                type="button"
                onClick={() => toggleCollapse(group.domain)}
                className="p-1 text-text-muted hover:text-text-primary shrink-0 ml-1"
              >
                {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Individual Tab Items */}
            {!isCollapsed && (
              <div className="p-2 space-y-1 bg-surface-card border-t border-border/40">
                {group.tabs.map((tab, idx) => {
                  const globalIdx = group.indices[idx];
                  const isSelected = selectedIndices.has(globalIdx);

                  return (
                    <label
                      key={globalIdx}
                      className="flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-surface cursor-pointer text-[11px] text-text-secondary transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleIndex(globalIdx)}
                        className="accent-pepper-500 w-3 h-3 rounded"
                      />
                      {tab.favIconUrl && (
                        <img
                          src={tab.favIconUrl}
                          alt=""
                          className="w-3.5 h-3.5 rounded object-cover shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/icons/icon-16.png';
                          }}
                        />
                      )}
                      <span className="truncate text-text-primary flex-1">{tab.title || tab.url}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
