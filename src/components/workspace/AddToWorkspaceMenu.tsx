import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Star, FolderPlus } from 'lucide-react';
import { PepperSession, PepperTab } from '../../core/types/session';
import { sessionEngine } from '../../core/engines/session-engine';
import { workspaceMembership, recentWorkspaces } from '../../core/engines/workspace-membership';
import { useSettingsStore } from '../../stores/settings-store';
import { generateSessionName, baseDomain } from '../../core/engines/session-naming';

interface Props {
  tabs: PepperTab[];
  /** Accessible name, e.g. "Add Stripe docs to workspace" */
  label: string;
  /** Icon-only "+" (default) or a text button */
  text?: string;
  className?: string;
}

/**
 * Small menu for putting one or more tabs into a workspace: the active workspace
 * first, then recent ones, then "New workspace". Keyboard operable.
 */
export const AddToWorkspaceMenu: React.FC<Props> = ({ tabs, label, text, className = '' }) => {
  const { settings, updateSettings } = useSettingsStore();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<PepperSession[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setWorkspaces(await sessionEngine.getAllSessions());
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, load]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();
  }, [open, workspaces.length]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2500);
    return () => clearTimeout(t);
  }, [message]);

  const active = workspaces.find((w) => w.id === settings.activeWorkspaceId);
  const recent = recentWorkspaces(workspaces, 6).filter((w) => w.id !== active?.id);
  const listed = active ? [active, ...recent] : recent;

  const addTo = async (ws: PepperSession) => {
    const res = await workspaceMembership.addTabs(ws.id, tabs);
    setMessage(res.added > 0 ? `Added to ${ws.name}` : `Already in ${ws.name}`);
    setOpen(false);
  };

  const createNew = async () => {
    const first = tabs[0];
    const fallback = first ? generateSessionName(tabs, [baseDomain(new URL(first.url).hostname)]) : 'New Workspace';
    try {
      const ws = await workspaceMembership.createFromTabs(newName.trim() || fallback, tabs);
      await workspaceMembership.setActiveWorkspace(ws.id);
      setMessage(`Created ${ws.name}`);
    } catch {
      setMessage('Nothing to add');
    }
    setCreating(false);
    setNewName('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
      rootRef.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`} onKeyDown={onKeyDown}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Fixed positioning so the menu is not clipped by scrolling lists
          const r = e.currentTarget.getBoundingClientRect();
          const right = Math.max(8, window.innerWidth - r.right);
          setPos(r.bottom > window.innerHeight - 260 ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right });
          setOpen((o) => !o);
        }}
        className={
          text
            ? 'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-xs font-semibold text-text-primary hover:bg-surface-hover'
            : 'p-1 rounded-md text-text-muted hover:text-pepper-400 hover:bg-surface-hover'
        }
      >
        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
        {text && <span>{text}</span>}
      </button>

      {message && (
        <span role="status" className="absolute right-0 top-full mt-1 z-50 whitespace-nowrap rounded-md bg-surface-card border border-border px-2 py-1 text-xs font-semibold text-emerald-500 shadow">
          {message}
        </span>
      )}

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Choose a workspace"
          style={pos ?? undefined}
          className="fixed z-50 w-60 max-h-64 overflow-y-auto rounded-xl border border-border bg-surface-card shadow-2xl p-1 space-y-0.5"
        >
          {listed.length === 0 && !creating && (
            <p className="px-3 py-2 text-xs text-text-muted">No workspaces yet. Create your first one below.</p>
          )}
          {listed.map((w) => (
            <div key={w.id} className="flex items-center gap-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => addTo(w)}
                className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-text-primary hover:bg-surface-hover"
              >
                {w.id === active?.id && <Star className="w-3 h-3 text-amber-700 dark:text-amber-400 fill-amber-400 shrink-0" aria-hidden="true" />}
                <span className="truncate">{w.name}</span>
                <span className="ml-auto text-xs text-text-muted shrink-0">{w.tabCount}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                aria-label={w.id === active?.id ? `${w.name} is the active workspace` : `Make ${w.name} the active workspace`}
                title="Make active"
                onClick={() => updateSettings({ activeWorkspaceId: w.id === active?.id ? null : w.id })}
                className="p-1.5 rounded-md text-text-muted hover:text-amber-700 dark:text-amber-400"
              >
                <Star className={`w-3 h-3 ${w.id === active?.id ? 'text-amber-700 dark:text-amber-400 fill-amber-400' : ''}`} aria-hidden="true" />
              </button>
            </div>
          ))}

          {creating ? (
            <form
              className="flex items-center gap-1 p-1"
              onSubmit={(e) => {
                e.preventDefault();
                void createNew();
              }}
            >
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                aria-label="New workspace name"
                placeholder="Workspace name (optional)"
                maxLength={80}
                className="flex-1 min-w-0 bg-surface border border-border rounded-md px-2 py-1 text-xs text-text-primary"
              />
              <button type="submit" className="px-2 py-1 rounded-md bg-pepper-500 text-white text-xs font-bold">
                Create
              </button>
            </form>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold text-pepper-400 hover:bg-surface-hover"
            >
              <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
              New workspace…
            </button>
          )}
        </div>
      )}
    </div>
  );
};
