import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../storage/db';
import { taskEngine } from '../../core/engines/task-engine';
import { FocusSession } from '../../core/types/focus-session';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { toast } from '../ui/toast-store';

const DISMISSED_KEY = 'pepper_dismissed_task_prompts';
/** A finished session stops asking about its task after this long. */
const RECENT_MS = 30 * 60 * 1000;

function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function rememberDismissed(id: string): void {
  try {
    const next = [...loadDismissed(), id].slice(-50);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  } catch {
    // storage blocked: the prompt just comes back next time
  }
}

interface Props {
  session: FocusSession;
  /** Called after the user answers, either way. */
  onAnswered?: () => void;
  className?: string;
}

/** "Session finished. Mark the task done?" Renders nothing when the task is gone or already done. */
export const FocusTaskPrompt: React.FC<Props> = ({ session, onAnswered, className = '' }) => {
  const task = useLiveQuery(() => (session.taskId ? taskEngine.get(session.taskId) : undefined), [session.taskId]);
  if (!task || task.done) return null;

  const answer = () => {
    rememberDismissed(session.id);
    onAnswered?.();
  };
  const markDone = async () => {
    await taskEngine.setDone(task.id, true);
    toast('Task done', { actionLabel: 'Undo', onAction: () => void taskEngine.setDone(task.id, false), duration: 4000 });
    answer();
  };

  return (
    <Card tone="butter" as="section" aria-label="Task check" pad="sm" className={`space-y-3 ${className}`} data-testid="focus-task-prompt">
      <div>
        <p className="eyebrow opacity-75">Session finished</p>
        <p className="text-sm font-bold mt-0.5">Is “{task.title}” done?</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={markDone}>
          Mark done
        </Button>
        <Button size="sm" variant="ghost" onClick={answer}>
          Not yet
        </Button>
      </div>
    </Card>
  );
};

/**
 * Finds the latest finished focus session that had a still-open task and offers to close it.
 * Works even when the timer ended in the background while no Pepper page was open.
 */
export const PendingFocusTaskPrompt: React.FC<{ className?: string }> = ({ className }) => {
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const session = useLiveQuery(async () => {
    const last = await db.focusSessions
      .orderBy('startedAt')
      .reverse()
      .filter((f) => f.status === 'completed' && !!f.taskId)
      .first();
    return last && Date.now() - (last.endedAt ?? last.startedAt) < RECENT_MS ? last : null;
  }, []);

  if (!session || dismissed.has(session.id)) return null;
  return <FocusTaskPrompt session={session} className={className} onAnswered={() => setDismissed(new Set(dismissed).add(session.id))} />;
};
