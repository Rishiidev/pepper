import React, { useMemo, useState } from 'react';
import { GitMerge, FolderPlus, Search } from 'lucide-react';
import { PepperSession } from '../../core/types/session';
import { INBOX_SESSION_ID } from '../../core/constants/ids';
import { searchEngine } from '../../core/engines/search-engine';
import { useSessionStore } from '../../stores/session-store';
import { Button, EmptyState } from '../ui';
import { WorkspaceCard } from './WorkspaceCard';
import { MergeDuplicatesModal } from '../modals/MergeDuplicatesModal';
import { CreateProjectModal } from '../modals/CreateProjectModal';

type Filter = 'all' | 'pinned' | 'favorites' | 'auto' | 'recovered';
type Sort = 'recent' | 'name' | 'tabs';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'auto', label: 'Auto-saved' },
  { id: 'recovered', label: 'Recovered' },
];

interface Props {
  onRestore: (s: PepperSession) => void;
  onSave: () => void;
}

export const WorkspacesView: React.FC<Props> = ({ onRestore, onSave }) => {
  const { sessions, fetchSessions } = useSessionStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [project, setProject] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('recent');
  const [query, setQuery] = useState('');
  const [merge, setMerge] = useState(false);
  const [newProject, setNewProject] = useState(false);

  const real = useMemo(() => sessions.filter((s) => s.id !== INBOX_SESSION_ID), [sessions]);
  const projects = useMemo(() => [...new Set(real.map((s) => s.projectName || 'General'))].filter((p) => p !== 'General'), [real]);

  const shown = useMemo(() => {
    let list = query.trim() ? searchEngine.search(real, { query }) : [...real];
    if (filter === 'pinned') list = list.filter((s) => s.isPinned);
    if (filter === 'favorites') list = list.filter((s) => s.isFavorite);
    if (filter === 'auto') list = list.filter((s) => s.captureType === 'auto_window_close');
    if (filter === 'recovered') list = list.filter((s) => s.captureType === 'crash_recovery');
    if (project) list = list.filter((s) => (s.projectName || 'General') === project);
    if (!query.trim()) {
      if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
      else if (sort === 'tabs') list.sort((a, b) => b.tabCount - a.tabCount);
      else list.sort((a, b) => b.createdAt - a.createdAt);
      list.sort((a, b) => Number(!!b.isPinned) - Number(!!a.isPinned));
    }
    return list;
  }, [real, filter, project, sort, query]);

  const chip = (active: boolean) =>
    `h-8 rounded-full px-3.5 text-xs font-semibold border ${active ? 'bg-text-primary text-surface-card border-transparent' : 'hover:bg-surface-hover'}`;

  return (
    <section aria-labelledby="ws-title" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="ws-title" className="text-[28px] font-bold leading-tight">
          Workspaces
        </h1>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setMerge(true)}>
            <GitMerge className="w-4 h-4" aria-hidden="true" />
            Merge duplicates
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setNewProject(true)}>
            <FolderPlus className="w-4 h-4" aria-hidden="true" />
            New project
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            aria-label="Filter workspaces"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter"
            className="h-9 w-52 rounded-full border bg-surface-card pl-9 pr-3 text-sm"
            style={{ borderColor: 'var(--pp-border-strong)' }}
          />
        </div>
        <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={chip(filter === f.id)} style={filter === f.id ? undefined : { borderColor: 'var(--pp-border-strong)' }}>
              {f.label}
            </button>
          ))}
          {projects.map((p) => (
            <button key={p} type="button" aria-pressed={project === p} onClick={() => setProject(project === p ? null : p)} className={chip(project === p)} style={project === p ? undefined : { borderColor: 'var(--pp-border-strong)' }}>
              {p}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs text-text-muted">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-9 rounded-input border bg-surface-card px-2 text-sm text-text-primary" style={{ borderColor: 'var(--pp-border-strong)' }}>
            <option value="recent">Recent</option>
            <option value="name">Name</option>
            <option value="tabs">Most tabs</option>
          </select>
        </label>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={real.length === 0 ? 'No workspaces yet' : 'Nothing matches'}
          body={real.length === 0 ? 'Close a window and Pepper saves it, or save this one now.' : 'Try another filter or clear the search.'}
          action={
            real.length === 0 ? (
              <Button variant="primary" onClick={onSave}>
                Save window
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setFilter('all');
                  setProject(null);
                  setQuery('');
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map((s) => (
            <WorkspaceCard key={s.id} session={s} onRestore={onRestore} />
          ))}
        </div>
      )}

      <MergeDuplicatesModal isOpen={merge} onClose={() => setMerge(false)} />
      <CreateProjectModal isOpen={newProject} onClose={() => setNewProject(false)} onCreated={() => void fetchSessions()} />
    </section>
  );
};
