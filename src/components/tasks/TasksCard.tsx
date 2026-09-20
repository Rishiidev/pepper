import React, { useMemo, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { useTasks } from './useTasks';
import { TaskAddInput } from './TaskAddInput';
import { TaskList } from './TaskList';
import { Card, CardHeader } from '../ui/Card';
import { useSessionStore } from '../../stores/session-store';
import { useSettingsStore } from '../../stores/settings-store';
import { useFocusStore } from '../../stores/focus-store';
import { openTasks, taskEngine } from '../../core/engines/task-engine';
import { getFocusTargetForTask } from '../../core/engines/focus-target';
import { PepperTask } from '../../core/types/task';
import { toast } from '../ui/toast-store';

const VISIBLE = 4;

/**
 * Compact task list for the popup and side panel. With an active workspace it shows that
 * workspace's tasks (your "work mode"); otherwise everything open. It only ever renders
 * inside Pepper's own pages: nothing is injected into the sites you browse.
 */
export const TasksCard: React.FC = () => {
  const tasks = useTasks();
  const { sessions } = useSessionStore();
  const activeWorkspaceId = useSettingsStore((s) => s.settings.activeWorkspaceId);
  const { activeSession, isRunning, startFocus } = useFocusStore();
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const active = sessions.find((s) => s.id === activeWorkspaceId) ?? null;
  const scoped = !!active && !showAll;
  const open = useMemo(() => openTasks(tasks), [tasks]);
  const visible = scoped ? open.filter((t) => t.workspaceId === active!.id) : open;
  const shown = expanded ? visible : visible.slice(0, VISIBLE);
  const names = useMemo(() => new Map(sessions.map((s) => [s.id, s.name])), [sessions]);

  const focusOn = async (task: PepperTask) => {
    await startFocus(await getFocusTargetForTask(task), 'pomodoro', 25, { id: task.id, title: task.title });
  };

  const addCurrentTab = async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const added = tab ? await taskEngine.addFromTab(tab, scoped ? active!.id : undefined) : null;
    toast(added ? 'Added this tab as a task' : 'This page cannot be added as a task');
  };

  return (
    <Card as="section" aria-labelledby="tasks-title" pad="sm" className="space-y-3" data-testid="tasks-card">
      <CardHeader
        eyebrow={scoped ? 'Tasks · active workspace' : 'Tasks'}
        titleId="tasks-title"
        title={scoped ? active!.name : visible.length === 0 ? 'Nothing to do' : `${visible.length} to do`}
        icon={<ListChecks className="w-4 h-4" />}
      />
      <TaskList
        label="Open tasks"
        tasks={shown}
        workspaceNames={scoped ? undefined : names}
        onFocus={isRunning ? undefined : focusOn}
        focusingTaskId={isRunning ? activeSession?.taskId : null}
        emptyText={scoped ? 'No tasks for this workspace yet.' : 'Add one below, or right-click a page and choose “Add this tab as a task”.'}
      />
      {visible.length > VISIBLE && (
        <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="text-xs font-semibold underline underline-offset-2">
          {expanded ? 'Show fewer' : `Show ${visible.length - VISIBLE} more`}
        </button>
      )}
      <TaskAddInput workspaceId={scoped ? active!.id : undefined} label={scoped ? `Add a task to ${active!.name}` : 'Add a task'} />
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-text-secondary">
        <button type="button" onClick={addCurrentTab} className="underline underline-offset-2">
          Add tab as task
        </button>
        {active && (
          <button type="button" onClick={() => setShowAll(!showAll)} className="underline underline-offset-2 truncate">
            {showAll ? `Only ${active.name}` : `All tasks (${open.length})`}
          </button>
        )}
      </div>
    </Card>
  );
};
