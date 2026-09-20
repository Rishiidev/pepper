import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, Save, Search, Star, X } from 'lucide-react';
import { useCommandStore } from '../../stores/command-store';
import { useSessionStore } from '../../stores/session-store';
import { searchEngine } from '../../core/engines/search-engine';
import { sanitizeDisplayTitle } from '../../core/utils/text-sanitizer';
import { recordActivation } from '../../core/engines/activation';
import { Card } from '../ui/Card';
import { Chip, Kbd } from '../ui/Chip';
import { FaviconStack } from '../ui/FaviconStack';

const MATCH_LABELS: Record<string, string> = {
  name: 'Name',
  intent: 'Intent',
  summary: 'Summary',
  project: 'Project',
  tag: 'Tag',
  domain: 'Site',
  tab_title: 'Tab title',
  tab_url: 'URL',
  all: 'Recent',
};

const RECENT_KEY = 'pepper_recent_searches';

const loadRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
};

const timeAgo = (ts: number) => {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
};

interface Row {
  id: string;
  kind: 'action' | 'workspace';
  label: string;
  run: () => void | Promise<void>;
  sessionId?: string;
}

/** Find anything: workspaces, tabs and sites. Works offline, no AI needed. */
export const CommandPalette: React.FC = () => {
  const { isOpen, searchQuery, closePalette, setSearchQuery } = useCommandStore();
  const { sessions, saveWorkspace, restoreSession, deleteSession, toggleFavorite } = useSessionStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(0);
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const counted = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useCommandStore.getState().togglePalette();
      } else if (e.key === 'Escape' && isOpen) {
        closePalette();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closePalette]);

  useEffect(() => {
    if (isOpen) {
      counted.current = false;
      setRecent(loadRecent());
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  const ranked = useMemo(() => (isOpen ? searchEngine.rankedSearch(sessions, { query: searchQuery }).slice(0, 12) : []), [isOpen, sessions, searchQuery]);

  useEffect(() => setSelected(0), [searchQuery, isOpen]);
  useEffect(() => {
    if (isOpen && searchQuery.trim() && !counted.current) {
      counted.current = true;
      void recordActivation('search');
    }
  }, [isOpen, searchQuery]);

  const rememberQuery = () => {
    const q = searchQuery.trim();
    if (!q) return;
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...loadRecent().filter((x) => x !== q)].slice(0, 5)));
    } catch {
      // storage blocked
    }
  };

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') });
    else window.open('/manager.html', '_blank');
  };

  const rows: Row[] = useMemo(() => {
    const actions: Row[] = searchQuery
      ? []
      : [
          { id: 'save', kind: 'action', label: 'Save this window', run: async () => void (await saveWorkspace()) },
          { id: 'dash', kind: 'action', label: 'Open dashboard', run: openDashboard },
        ];
    const workspaces: Row[] = ranked.map((r) => ({
      id: r.session.id,
      kind: 'workspace',
      label: r.session.name,
      sessionId: r.session.id,
      run: () => restoreSession(r.session.id),
    }));
    return [...actions, ...workspaces];
  }, [ranked, searchQuery, saveWorkspace, restoreSession]);

  if (!isOpen) return null;

  const choose = async (row: Row) => {
    rememberQuery();
    closePalette();
    await row.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (rows.length === 0 && e.key !== 'Enter') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => (s + 1) % Math.max(1, rows.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => (s - 1 + rows.length) % Math.max(1, rows.length));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSelected(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSelected(Math.max(0, rows.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (rows[selected]) void choose(rows[selected]);
    }
  };

  const byId = new Map(ranked.map((r) => [r.session.id, r]));
  const actionRows = rows.filter((r) => r.kind === 'action');
  const wsRows = rows.filter((r) => r.kind === 'workspace');

  const renderWorkspace = (row: Row, index: number) => {
    const r = byId.get(row.id)!;
    const s = r.session;
    const isSel = index === selected;
    return (
      <div
        key={row.id}
        id={`pepper-palette-item-${index}`}
        role="option"
        aria-selected={isSel}
        ref={(el) => {
          if (isSel && el) el.scrollIntoView({ block: 'nearest' });
        }}
        onClick={() => void choose(row)}
        className={`group flex cursor-pointer items-center gap-3 rounded-inner px-3 py-2.5 ${isSel ? 'bg-surface-active' : 'hover:bg-surface-hover'}`}
      >
        <FaviconStack items={s.tabs} max={3} size={24} ring={isSel ? 'var(--pp-card-active)' : 'var(--pp-card)'} total={s.tabCount} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {s.isFavorite && <Star className="inline w-3.5 h-3.5 mr-1 -mt-0.5 fill-current" aria-hidden="true" />}
            {sanitizeDisplayTitle(s.name, s.tabs)}
          </p>
          <p className="text-xs text-text-muted">
            {s.tabCount} tabs · {timeAgo(s.createdAt)}
            {s.captureType === 'crash_recovery' ? ' · Recovered' : s.captureType === 'auto_window_close' ? ' · Auto-saved' : ''}
          </p>
        </div>
        {searchQuery && <Chip tone="lilac">{MATCH_LABELS[r.matchReason] || 'Match'}</Chip>}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            aria-label={`${s.isFavorite ? 'Unfavorite' : 'Favorite'} ${s.name}`}
            onClick={(e) => {
              e.stopPropagation();
              void toggleFavorite(s.id);
            }}
            className="w-8 h-8 rounded-full hover:bg-surface-hover flex items-center justify-center"
          >
            <Star className={`w-4 h-4 ${s.isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${s.name}`}
            onClick={(e) => {
              e.stopPropagation();
              void deleteSession(s.id);
            }}
            className="w-8 h-8 rounded-full hover:bg-surface-hover flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12vh] bg-black/50 animate-fade-in"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && closePalette()}
    >
      <Card pad="none" role="dialog" aria-modal="true" aria-label="Find anything" className="w-full max-w-[560px] max-h-[70vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
          <Search className="w-5 h-5 text-text-muted shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="pepper-palette-list"
            aria-activedescendant={rows.length ? `pepper-palette-item-${selected}` : undefined}
            aria-autocomplete="list"
            aria-label="Find anything"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Find a workspace, tab or site"
            className="flex-1 bg-transparent text-base placeholder:text-text-muted focus:outline-none"
          />
          {searchQuery && (
            <button type="button" aria-label="Clear search" onClick={() => setSearchQuery('')} className="w-8 h-8 rounded-full hover:bg-surface-hover flex items-center justify-center">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          <Kbd>Esc</Kbd>
        </div>

        <div id="pepper-palette-list" role="listbox" aria-label="Results" className="overflow-y-auto p-2">
          {!searchQuery && recent.length > 0 && (
            <div className="px-2 pb-2 flex flex-wrap items-center gap-2">
              <span className="eyebrow text-text-muted">Recent searches</span>
              {recent.map((q) => (
                <button key={q} type="button" onClick={() => setSearchQuery(q)} className="rounded-full border border-border px-3 h-7 text-xs font-semibold hover:bg-surface-hover">
                  {q}
                </button>
              ))}
            </div>
          )}

          {actionRows.length > 0 && (
            <div role="group" aria-label="Actions" className="pb-2">
              <p className="eyebrow text-text-muted px-3 py-1">Actions</p>
              {actionRows.map((row, i) => (
                <button
                  key={row.id}
                  id={`pepper-palette-item-${i}`}
                  role="option"
                  aria-selected={selected === i}
                  tabIndex={-1}
                  onClick={() => void choose(row)}
                  className={`flex w-full items-center gap-3 rounded-inner px-3 py-2.5 text-left ${selected === i ? 'bg-surface-active' : 'hover:bg-surface-hover'}`}
                >
                  <span aria-hidden="true" className="w-8 h-8 rounded-full bg-surface-active flex items-center justify-center">
                    {row.id === 'save' ? <Save className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                  </span>
                  <span className="flex-1 text-sm font-semibold">{row.label}</span>
                </button>
              ))}
            </div>
          )}

          <div role="group" aria-label="Workspaces">
            <p className="eyebrow text-text-muted px-3 py-1">{searchQuery ? `Workspaces (${wsRows.length})` : 'Recent workspaces'}</p>
            {wsRows.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-text-muted">
                {searchQuery ? `Nothing matches “${searchQuery}”. Try fewer words or check the spelling.` : 'No workspaces yet. Close a window and Pepper saves it for you.'}
              </p>
            ) : (
              wsRows.map((row, i) => renderWorkspace(row, actionRows.length + i))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 h-10 text-xs text-text-muted">
          <span className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
          </span>
          <span>Works offline. No AI needed.</span>
        </div>
      </Card>
    </div>
  );
};
