import React from 'react';
import { Check, ExternalLink, Play, X } from 'lucide-react';
import { PepperTask } from '../../core/types/task';
import { taskEngine } from '../../core/engines/task-engine';
import { Chip } from '../ui/Chip';
import { toast } from '../ui/toast-store';

interface RowProps {
  task: PepperTask;
  /** Shown as a small chip when the list mixes workspaces */
  workspaceName?: string;
  /** Start a focus session on this task */
  onFocus?: (task: PepperTask) => void;
  focusing?: boolean;
}

const iconBtn = 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-active';

export const TaskRow: React.FC<RowProps> = ({ task, workspaceName, onFocus, focusing }) => {
  const toggle = async () => {
    const next = !task.done;
    await taskEngine.setDone(task.id, next);
    if (next) toast('Task done', { actionLabel: 'Undo', onAction: () => void taskEngine.setDone(task.id, false), duration: 4000 });
  };

  const remove = async () => {
    const removed = await taskEngine.remove(task.id);
    if (removed) toast('Task removed', { actionLabel: 'Undo', onAction: () => taskEngine.restore(removed) });
  };

  return (
    <li className="group flex items-center gap-1.5 rounded-input px-1 py-0.5 hover:bg-surface-hover" data-testid="task-row">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={`${task.done ? 'Reopen' : 'Complete'}: ${task.title}`}
        onClick={toggle}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
      >
        <span
          aria-hidden="true"
          className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 ${task.done ? 'border-text-primary bg-text-primary text-surface-card' : 'border-text-muted'}`}
        >
          {task.done && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      </button>
      <span className={`min-w-0 flex-1 truncate text-sm ${task.done ? 'text-text-muted line-through' : ''}`} title={task.title}>
        {task.title}
      </span>
      {focusing && <Chip tone="mint">In focus</Chip>}
      {workspaceName && <Chip className="max-w-24 truncate">{workspaceName}</Chip>}
      {task.url && (
        <a href={task.url} target="_blank" rel="noreferrer noopener" aria-label={`Open page for ${task.title}`} title={task.url} className={iconBtn}>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
      {onFocus && !task.done && !focusing && (
        <button type="button" aria-label={`Focus on ${task.title}`} title="Start a focus session on this" onClick={() => onFocus(task)} className={iconBtn}>
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
      <button type="button" aria-label={`Remove ${task.title}`} onClick={remove} className={`${iconBtn} opacity-0 group-hover:opacity-100 focus:opacity-100`}>
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </li>
  );
};

interface ListProps {
  tasks: PepperTask[];
  workspaceNames?: Map<string, string>;
  onFocus?: (task: PepperTask) => void;
  focusingTaskId?: string | null;
  emptyText?: string;
  label: string;
  className?: string;
}

export const TaskList: React.FC<ListProps> = ({ tasks, workspaceNames, onFocus, focusingTaskId, emptyText, label, className = '' }) => {
  if (tasks.length === 0) return emptyText ? <p className="text-sm text-text-muted">{emptyText}</p> : null;
  return (
    <ul aria-label={label} className={`-mx-1 ${className}`}>
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} workspaceName={t.workspaceId ? workspaceNames?.get(t.workspaceId) : undefined} onFocus={onFocus} focusing={focusingTaskId === t.id} />
      ))}
    </ul>
  );
};
