import React, { useState, useMemo } from 'react';
import { PepperSession } from '../../core/types/session';
import { FocusSession } from '../../core/types/focus-session';
import { useSessionStore } from '../../stores/session-store';
import { Search, Filter, Calendar, Brain, Clock, RotateCcw, X, Sparkles, Folder, CheckCircle2, ArrowUpRight } from 'lucide-react';

interface Props {
  sessions: PepperSession[];
  focusSessions: FocusSession[];
  onSelectDate: (dateStr: string) => void;
}

export const SearchableWorkMemory: React.FC<Props> = ({ sessions, focusSessions, onSelectDate }) => {
  const { restoreSession } = useSessionStore();
  const [query, setQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);

  const projects = useMemo(() => {
    const list = Array.from(new Set(sessions.map((s) => s.projectName || 'General'))).filter(Boolean);
    return ['all', ...list];
  }, [sessions]);

  // Combined searchable memory index
  const searchResults = useMemo(() => {
    const cleanQ = query.toLowerCase().trim();
    if (!cleanQ && selectedProject === 'all' && selectedMode === 'all' && selectedStatus === 'all') {
      return [];
    }

    const matchedSessions: Array<{
      type: 'workspace' | 'focus_session';
      id: string;
      title: string;
      subtitle: string;
      dateStr: string;
      timestamp: number;
      projectName: string;
      summary?: string;
      accomplishments?: string[];
      targetSessionId?: string;
    }> = [];

    // Search workspaces
    for (const w of sessions) {
      if (selectedProject !== 'all' && (w.projectName || 'General') !== selectedProject) continue;

      const haystack = `${w.name} ${w.projectName || ''} ${w.summary || ''} ${(w.tags || []).join(' ')} ${w.tabs.map((t) => t.title + ' ' + t.url).join(' ')}`.toLowerCase();

      if (!cleanQ || haystack.includes(cleanQ)) {
        matchedSessions.push({
          type: 'workspace',
          id: w.id,
          title: w.name,
          subtitle: `${w.tabCount} tabs • ${w.projectName || 'General'}`,
          dateStr: new Date(w.createdAt).toISOString().split('T')[0],
          timestamp: w.createdAt,
          projectName: w.projectName || 'General',
          summary: w.summary,
          targetSessionId: w.id,
        });
      }
    }

    // Search focus sessions
    for (const f of focusSessions) {
      if (selectedProject !== 'all' && (f.projectName || 'General') !== selectedProject) continue;
      if (selectedMode !== 'all' && f.mode !== selectedMode) continue;
      if (selectedStatus !== 'all' && f.status !== selectedStatus) continue;

      const haystack = `${f.workspaceName} ${f.projectName || ''} ${f.aiSummary || ''} ${f.userNotes || ''} ${(f.accomplishments || []).join(' ')}`.toLowerCase();

      if (!cleanQ || haystack.includes(cleanQ)) {
        matchedSessions.push({
          type: 'focus_session',
          id: f.id,
          title: `${f.workspaceName} (${f.mode.toUpperCase()})`,
          subtitle: `${Math.round(f.elapsedSeconds / 60)}m focused • ${f.projectName || 'General'}`,
          dateStr: new Date(f.startedAt).toISOString().split('T')[0],
          timestamp: f.startedAt,
          projectName: f.projectName || 'General',
          summary: f.aiSummary,
          accomplishments: f.accomplishments,
          targetSessionId: f.sessionId,
        });
      }
    }

    return matchedSessions.sort((a, b) => b.timestamp - a.timestamp);
  }, [query, selectedProject, selectedMode, selectedStatus, sessions, focusSessions]);

  const presetQueries = [
    'checkout work',
    'product titles',
    'research',
    'unfinished tasks',
  ];

  return (
    <div className="bg-surface-card border border-border/80 rounded-3xl p-6 space-y-4 shadow-xl select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-pepper-400 px-2.5 py-0.5 rounded-md bg-pepper-500/10 border border-pepper-500/20">
              Searchable Work Memory
            </span>
          </div>
          <h3 className="text-base font-bold text-text-primary tracking-tight pt-1">
            Semantic &amp; Keyword Work Memory Search
          </h3>
        </div>

        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-xs font-bold text-pepper-400 hover:underline flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Search</span>
          </button>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Try searching: "checkout work", "product titles", "unfinished marketing tasks", or "July 29"'
          className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-xs font-semibold text-text-primary placeholder:text-text-muted focus:outline-none focus:border-pepper-500 transition-colors shadow-inner"
        />
      </div>

      {/* Preset Quick Chips & Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Suggestions:</span>
          {presetQueries.map((q) => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              className="px-2.5 py-1 rounded-lg bg-surface border border-border/60 text-[11px] font-medium text-text-secondary hover:text-pepper-400 hover:border-pepper-500/40 transition-colors"
            >
              "{q}"
            </button>
          ))}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-muted" />

          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-surface border border-border rounded-lg px-2.5 py-1 text-xs font-semibold text-pepper-400 focus:outline-none cursor-pointer"
          >
            <option value="all">All Projects</option>
            {projects.filter((p) => p !== 'all').map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="bg-surface border border-border rounded-lg px-2.5 py-1 text-xs font-semibold text-pepper-400 focus:outline-none cursor-pointer"
          >
            <option value="all">All Modes</option>
            <option value="pomodoro">Pomodoro</option>
            <option value="timer">Timer</option>
            <option value="stopwatch">Stopwatch</option>
          </select>
        </div>
      </div>

      {/* Search Results List */}
      {query || selectedProject !== 'all' || selectedMode !== 'all' ? (
        <div className="space-y-3 pt-2">
          <div className="text-xs text-text-muted font-semibold flex items-center justify-between pb-1 border-b border-border/40">
            <span>Search Results ({searchResults.length})</span>
            {searchResults.length > 0 && <span>Click any result to jump to date or resume</span>}
          </div>

          {searchResults.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-2xl bg-surface/30 text-text-muted text-xs">
              No work memories or focus logs match your search filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto pr-1">
              {searchResults.map((res) => (
                <div
                  key={res.id}
                  onClick={() => onSelectDate(res.dateStr)}
                  className="p-3.5 rounded-2xl bg-surface border border-border/60 hover:border-pepper-500/40 hover:bg-surface-hover/80 transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-pepper-500/10 text-pepper-400 border border-pepper-500/20">
                        {res.type === 'workspace' ? 'Workspace' : 'Focus Session'}
                      </span>
                      <h4 className="text-xs font-bold text-text-primary tracking-tight group-hover:text-pepper-400 transition-colors">
                        {res.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-text-muted">{res.dateStr}</span>
                      {res.targetSessionId && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setIsRestoringId(res.targetSessionId!);
                            await restoreSession(res.targetSessionId!);
                            setIsRestoringId(null);
                          }}
                          disabled={isRestoringId === res.targetSessionId}
                          className="flex items-center gap-1 text-[11px] font-bold text-white bg-pepper-500 hover:bg-pepper-600 px-2.5 py-1 rounded-lg transition-colors shadow-sm"
                        >
                          <RotateCcw className={`w-3 h-3 ${isRestoringId === res.targetSessionId ? 'animate-spin' : ''}`} />
                          <span>Resume</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-text-secondary font-medium leading-relaxed">
                    {res.subtitle}
                  </p>

                  {res.summary && (
                    <div className="text-[11px] text-text-muted italic pl-2 border-l-2 border-pepper-500/30">
                      "{res.summary}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
