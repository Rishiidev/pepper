import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Pause, Play, Timer } from 'lucide-react';
import { useFocusStore } from '../../stores/focus-store';
import { useSessionStore } from '../../stores/session-store';
import { FocusMode, FocusSession } from '../../core/types/focus-session';
import { INBOX_SESSION_ID } from '../../core/constants/ids';
import { focusEngine } from '../../core/engines/focus-engine';
import { getFocusTargetForTask, openFocusTarget, OPEN_FOCUS_ID } from '../../core/engines/focus-target';
import { openTasks } from '../../core/engines/task-engine';
import { PepperTask } from '../../core/types/task';
import { useTasks } from '../tasks/useTasks';
import { TaskAddInput } from '../tasks/TaskAddInput';
import { TaskList } from '../tasks/TaskList';
import { PendingFocusTaskPrompt } from '../tasks/FocusTaskPrompt';
import { formatClock } from '../../core/engines/focus-timing';
import { formatDurationCompact } from '../../core/engines/timeline-replay';
import { Button, Card, CardHeader, Chip, Field, ProgressRing, Segmented, Stat } from '../ui';

const MODES: Array<{ value: FocusMode; label: string }> = [
  { value: 'pomodoro', label: 'Pomodoro' },
  { value: 'timer', label: 'Countdown' },
  { value: 'stopwatch', label: 'Stopwatch' },
];
const MINUTES = ['15', '25', '30', '45', '60', '90'];

const selectClass = 'h-10 w-full rounded-input border bg-surface-card px-3 text-sm text-text-primary';

export const FocusView: React.FC = () => {
  const { sessions } = useSessionStore();
  const { activeSession, activeMemory, isRunning, isPaused, elapsedSeconds, completedSessionForModal, startFocus, pauseFocus, resumeFocus, completeFocus, cancelFocus } = useFocusStore();
  const [mode, setMode] = useState<FocusMode>('pomodoro');
  const [minutes, setMinutes] = useState('25');
  const [targetId, setTargetId] = useState<string>(OPEN_FOCUS_ID);
  const [taskId, setTaskId] = useState('');
  const [history, setHistory] = useState<FocusSession[]>([]);
  const tasks = useTasks();
  const open = useMemo(() => openTasks(tasks), [tasks]);
  const recentDone = useMemo(() => tasks.filter((t) => t.done).slice(0, 5), [tasks]);
  const workspaceNames = useMemo(() => new Map(sessions.map((s) => [s.id, s.name])), [sessions]);

  const real = useMemo(() => sessions.filter((s) => s.id !== INBOX_SESSION_ID), [sessions]);
  useEffect(() => {
    void focusEngine.getAllSessions().then((all) => setHistory(all.filter((f) => f.status === 'completed').slice(0, 8)));
  }, [isRunning]);

  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todaySeconds = history.filter((f) => f.startedAt >= todayStart).reduce((a, f) => a + f.elapsedSeconds, 0);

  const start = () => {
    const target = real.find((s) => s.id === targetId) ?? openFocusTarget();
    const task = open.find((t) => t.id === taskId);
    void startFocus(target, mode, Number(minutes), task ? { id: task.id, title: task.title } : undefined);
    setTaskId('');
  };

  /** Picking a task also points "Attach to" at its workspace, when that workspace still exists. */
  const focusOn = async (t: PepperTask) => {
    await startFocus(await getFocusTargetForTask(t), mode, Number(minutes), { id: t.id, title: t.title });
  };

  const pickTask = (id: string) => {
    setTaskId(id);
    const ws = open.find((t) => t.id === id)?.workspaceId;
    if (ws && real.some((s) => s.id === ws)) setTargetId(ws);
  };

  if (isRunning && activeSession && activeMemory) {
    const countdown = activeSession.mode !== 'stopwatch' && activeSession.durationSeconds > 0;
    const shown = countdown ? Math.max(0, activeSession.durationSeconds - elapsedSeconds) : elapsedSeconds;
    const progress = countdown ? elapsedSeconds / activeSession.durationSeconds : 0;
    return (
      <section aria-labelledby="focus-title" className="space-y-5">
        <h1 id="focus-title" className="text-[28px] font-bold leading-tight">
          Focus
        </h1>
        <Card tone="mint" className="max-w-xl mx-auto text-center space-y-6 py-8">
          <p className="eyebrow opacity-75">{isPaused ? 'Paused' : 'Focusing'} · {activeSession.mode}</p>
          <div className="flex justify-center">
            <ProgressRing value={progress} size={240} stroke={12} label="Focus progress">
              <div>
                <p role="timer" aria-label={`${countdown ? 'time left' : 'elapsed'} ${formatClock(shown)}`} className="display-number !text-[56px]">
                  {formatClock(shown)}
                </p>
                <p className="text-sm opacity-80 mt-2">{countdown ? 'left' : 'elapsed'}</p>
              </div>
            </ProgressRing>
          </div>
          <div>
            <h2 className="text-xl font-bold">{activeSession.taskTitle ?? activeMemory.name}</h2>
            {activeSession.taskTitle && <p className="text-sm opacity-80">{activeMemory.name}</p>}
            {activeMemory.id !== OPEN_FOCUS_ID && (
              <p className="text-sm opacity-80">{activeMemory.tabCount} tabs · {activeMemory.projectName || 'General'}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {isPaused ? (
              <Button onClick={resumeFocus}>
                <Play className="w-4 h-4" aria-hidden="true" />
                Resume
              </Button>
            ) : (
              <Button onClick={pauseFocus}>
                <Pause className="w-4 h-4" aria-hidden="true" />
                Pause
              </Button>
            )}
            <Button onClick={() => completeFocus()}>
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              Finish
            </Button>
            <Button variant="ghost" onClick={cancelFocus}>
              Cancel
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section aria-labelledby="focus-title" className="space-y-5">
      <h1 id="focus-title" className="text-[28px] font-bold leading-tight">
        Focus
      </h1>

      <div className="grid grid-cols-12 gap-4">
        <Card tone="mint" className="col-span-12 lg:col-span-7 space-y-5">
          <CardHeader eyebrow="New session" title="What are you working on?" icon={<Timer className="w-4 h-4" />} />
          <Field label="Attach to">
            {(p) => (
              <select {...p} value={targetId} onChange={(e) => setTargetId(e.target.value)} className={selectClass} style={{ borderColor: 'var(--pp-border-strong)', color: 'var(--pp-text)' }}>
                <option value={OPEN_FOCUS_ID}>Nothing in particular</option>
                {real.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.tabCount} tabs)
                  </option>
                ))}
              </select>
            )}
          </Field>
          {open.length > 0 && (
            <Field label="Task (optional)">
              {(p) => (
                <select {...p} value={taskId} onChange={(e) => pickTask(e.target.value)} className={selectClass} style={{ borderColor: 'var(--pp-border-strong)', color: 'var(--pp-text)' }}>
                  <option value="">No task</option>
                  {open.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Mode</p>
            <Segmented<FocusMode> label="Focus mode" value={mode} onChange={setMode} options={MODES} />
          </div>
          {mode !== 'stopwatch' && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Minutes</p>
              <Segmented label="Minutes" value={minutes} onChange={setMinutes} options={MINUTES.map((m) => ({ value: m, label: m }))} />
            </div>
          )}
          <Button variant="primary" onClick={start}>
            Start focus
          </Button>
        </Card>

        <Card className="col-span-12 lg:col-span-5 space-y-4">
          <CardHeader eyebrow="Today" title="Focus time" />
          <Stat label="Focused" value={formatDurationCompact(todaySeconds * 1000)} hint={`${history.filter((f) => f.startedAt >= todayStart).length} sessions`} />
        </Card>
      </div>

      {!completedSessionForModal && <PendingFocusTaskPrompt />}

      <Card as="section" aria-labelledby="focus-tasks" className="space-y-3" data-testid="focus-tasks">
        <CardHeader eyebrow="Tasks" titleId="focus-tasks" title={open.length === 0 ? 'Nothing to do' : `${open.length} to do`} />
        <TaskList
          label="Tasks"
          tasks={[...open, ...recentDone]}
          workspaceNames={workspaceNames}
          onFocus={focusOn}
          emptyText="Add a task below, or from any tab’s “+” menu."
        />
        <TaskAddInput />
      </Card>

      <Card className="space-y-3">
        <CardHeader eyebrow="History" title="Recent sessions" />
        {history.length === 0 ? (
          <p className="text-sm text-text-muted">Finished sessions show up here, attached to the workspace you worked on.</p>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{f.workspaceName}</p>
                  <p className="text-xs text-text-muted">{new Date(f.startedAt).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</p>
                </div>
                {f.userReflection && <Chip>{f.userReflection}</Chip>}
                <span className="font-mono text-sm">{formatDurationCompact(f.elapsedSeconds * 1000)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
};
