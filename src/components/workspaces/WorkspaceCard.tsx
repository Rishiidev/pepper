import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ListChecks, MoreHorizontal, RotateCcw, X } from 'lucide-react';
import { PepperSession } from '../../core/types/session';
import { sessionEngine } from '../../core/engines/session-engine';
import { workspaceMembership } from '../../core/engines/workspace-membership';
import { focusEngine } from '../../core/engines/focus-engine';
import { formatDuration } from '../../core/engines/timeline-replay';
import { useSettingsStore } from '../../stores/settings-store';
import { useSessionStore } from '../../stores/session-store';
import { useFocusStore } from '../../stores/focus-store';
import { AutoTitleSkill } from '../../core/intelligence/skills/auto-title';
import { sanitizeDisplayTitle } from '../../core/utils/text-sanitizer';
import { Button, Card, Chip, FaviconStack, Menu, toast } from '../ui';
import { InlineRename } from '../feedback/InlineRename';
import { useTasks } from '../tasks/useTasks';
import { TaskAddInput } from '../tasks/TaskAddInput';
import { TaskList } from '../tasks/TaskList';

const ago = (ts: number) => {
  const m = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

interface Props {
  session: PepperSession;
  onRestore: (s: PepperSession) => void;
}

/** One saved workspace: recognizable at a glance, one obvious action, everything else in a menu. */
export const WorkspaceCard: React.FC<Props> = ({ session, onRestore }) => {
  const { settings, updateSettings } = useSettingsStore();
  const { fetchSessions, togglePin, toggleFavorite } = useSessionStore();
  const [expanded, setExpanded] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const tasks = useTasks().filter((t) => t.workspaceId === session.id);
  const openCount = tasks.filter((t) => !t.done).length;
  const [focusSeconds, setFocusSeconds] = useState(0);
  const isActive = settings.activeWorkspaceId === session.id;

  useEffect(() => {
    focusEngine
      .getSessionsForWorkspace(session.id)
      .then((list) => setFocusSeconds(list.filter((f) => f.status === 'completed').reduce((a, f) => a + f.elapsedSeconds, 0)))
      .catch(() => setFocusSeconds(0));
  }, [session.id, session.updatedAt]);

  const remove = async () => {
    const snapshot = session;
    await sessionEngine.deleteSession(session.id);
    if (isActive) await updateSettings({ activeWorkspaceId: null });
    toast(`Deleted “${snapshot.name}”`, {
      actionLabel: 'Undo',
      onAction: async () => {
        await sessionEngine.undelete(snapshot);
        await fetchSessions();
      },
    });
  };

  const suggestName = async () => {
    const skill = new AutoTitleSkill();
    const res = await skill.execute({ id: `title_${session.id}_${Date.now()}`, skillId: skill.id, priority: 'HIGH', requirements: skill.requirements, input: session.tabs, context: { traceId: `card_${Date.now()}`, createdAt: Date.now() } });
    if (res.success && typeof res.data === 'string') {
      await sessionEngine.updateSession(session.id, { name: res.data });
      toast(`Renamed to “${res.data}”`);
    } else {
      toast('Could not suggest a name');
    }
  };

  const removeTab = async (url: string) => {
    const removed = await workspaceMembership.removeTab(session.id, url);
    if (!removed) return;
    toast('Removed tab', { actionLabel: 'Undo', onAction: async () => void (await workspaceMembership.addTabs(session.id, [removed])) });
  };

  const captureChip =
    session.captureType === 'crash_recovery' ? <Chip tone="butter">Recovered</Chip> : session.captureType === 'auto_window_close' ? <Chip>Auto-saved</Chip> : null;

  return (
    <Card as="article" aria-label={session.name} className="flex flex-col gap-4" data-testid="workspace-card">
      <div className="flex items-start justify-between gap-2">
        <FaviconStack items={session.tabs} max={5} size={28} total={session.tabCount} />
        <Menu
          triggerLabel={`More actions for ${session.name}`}
          triggerClassName="w-8 h-8 rounded-full hover:bg-surface-hover flex items-center justify-center text-text-secondary"
          trigger={<MoreHorizontal className="w-4 h-4" aria-hidden="true" />}
          items={[
            { label: isActive ? 'Clear active workspace' : 'Make active', checked: isActive, onSelect: () => updateSettings({ activeWorkspaceId: isActive ? null : session.id }) },
            { label: session.isPinned ? 'Unpin' : 'Pin to top', onSelect: () => togglePin(session.id) },
            { label: session.isFavorite ? 'Remove favorite' : 'Favorite', onSelect: () => toggleFavorite(session.id) },
            { label: 'Add a task', onSelect: () => setTasksOpen(true) },
            { label: 'Start a 25 minute focus', onSelect: () => useFocusStore.getState().startFocus(session, 'pomodoro', 25) },
            { label: 'Suggest a name', onSelect: suggestName },
            { label: 'Delete', danger: true, onSelect: remove },
          ]}
        />
      </div>

      <div className="min-w-0">
        <h3 className="text-base font-bold leading-snug truncate">
          <InlineRename value={sanitizeDisplayTitle(session.name, session.tabs)} label="Workspace name" className="max-w-full" onSave={async (name) => void (await sessionEngine.updateSession(session.id, { name }))} />
        </h3>
        <p className="text-xs text-text-muted mt-0.5">
          {session.tabCount} tab{session.tabCount !== 1 ? 's' : ''} · {ago(session.createdAt)}
          {focusSeconds >= 60 ? ` · Focused ${formatDuration(focusSeconds * 1000)}` : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 min-h-6">
        {isActive && <Chip tone="mint">Active</Chip>}
        {session.isPinned && <Chip>Pinned</Chip>}
        {session.isFavorite && <Chip>Favorite</Chip>}
        {captureChip}
        {session.projectName && session.projectName !== 'General' && <Chip tone="lilac">{session.projectName}</Chip>}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-auto">
        <Button size="sm" onClick={() => onRestore(session)} className="flex-1 min-w-[6.5rem]" aria-label={`Restore ${session.name}`}>
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          Restore
        </Button>
        <Button size="sm" variant="ghost" aria-expanded={expanded} aria-label={`${expanded ? 'Hide' : 'Show'} tabs in ${session.name}`} onClick={() => setExpanded(!expanded)}>
          Tabs
          {expanded ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
        </Button>
        <Button size="sm" variant="ghost" aria-expanded={tasksOpen} aria-label={`${tasksOpen ? 'Hide' : 'Show'} tasks in ${session.name}${openCount ? `, ${openCount} open` : ''}`} onClick={() => setTasksOpen(!tasksOpen)} data-testid="workspace-tasks-toggle">
          <ListChecks className="w-4 h-4" aria-hidden="true" />
          {openCount > 0 ? openCount : 'Tasks'}
        </Button>
      </div>

      {tasksOpen && (
        <div className="-mx-1 border-t border-border pt-3 space-y-2 px-1" data-testid="workspace-tasks">
          <TaskList label={`Tasks in ${session.name}`} tasks={tasks} emptyText="No tasks yet." />
          <TaskAddInput workspaceId={session.id} label={`Add a task to ${session.name}`} />
        </div>
      )}

      {expanded && (
        <ul className="-mx-1 border-t border-border pt-2 space-y-0.5 max-h-64 overflow-y-auto">
          {session.tabs.map((t) => (
            <li key={t.url} className="group flex items-center gap-2 rounded-input px-1 py-1 hover:bg-surface-hover">
              <a href={t.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0">
                <span className="block truncate text-sm">{t.title || t.url}</span>
                <span className="block truncate text-xs text-text-muted">{hostOf(t.url)}</span>
              </a>
              <button type="button" aria-label={`Remove ${t.title || t.url} from this workspace`} onClick={() => removeTab(t.url)} className="w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-surface-active flex items-center justify-center">
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
