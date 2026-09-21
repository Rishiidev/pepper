import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { taskEngine, MAX_TASK_TITLE } from '../../core/engines/task-engine';
import { IconButton } from '../ui/Button';

interface Props {
  workspaceId?: string | null;
  /** Accessible name and placeholder */
  label?: string;
  className?: string;
}

/** One-line quick add. Enter adds; the field stays focused for the next one. */
export const TaskAddInput: React.FC<Props> = ({ workspaceId, label = 'Add a task', className = '' }) => {
  const [value, setValue] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const added = await taskEngine.add({ title: value, workspaceId });
    if (added) setValue('');
  };

  return (
    <form onSubmit={submit} className={`flex items-center gap-1 ${className}`}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={label}
        placeholder={label}
        maxLength={MAX_TASK_TITLE}
        className="h-9 min-w-0 flex-1 rounded-full border bg-surface-card px-4 text-sm text-text-primary placeholder:text-text-muted"
        style={{ borderColor: 'var(--pp-border-strong)' }}
      />
      <IconButton type="submit" aria-label="Save task" disabled={!value.trim()}>
        <Plus className="w-4 h-4" aria-hidden="true" />
      </IconButton>
    </form>
  );
};
