import React, { useState } from 'react';
import { Pause, Play, Square, Timer } from 'lucide-react';
import { useFocusStore } from '../../stores/focus-store';
import { getFocusTarget } from '../../core/engines/focus-target';
import { formatClock } from '../../core/engines/focus-timing';

const PRESETS = [15, 25, 50];

interface Props {
  /** Tighter layout for the popup */
  compact?: boolean;
}

/** One-click Pomodoro: start, pause and stop from the popup or the side panel. */
export const FocusQuickStart: React.FC<Props> = ({ compact = false }) => {
  const { activeSession, isRunning, isPaused, elapsedSeconds, startFocus, pauseFocus, resumeFocus, completeFocus, cancelFocus } = useFocusStore();
  const [minutes, setMinutes] = useState(25);
  const [starting, setStarting] = useState(false);

  const start = async () => {
    setStarting(true);
    try {
      await startFocus(await getFocusTarget(), 'pomodoro', minutes);
    } finally {
      setStarting(false);
    }
  };

  if (isRunning && activeSession) {
    const countdown = activeSession.mode !== 'stopwatch' && activeSession.durationSeconds > 0;
    const shown = countdown ? Math.max(0, activeSession.durationSeconds - elapsedSeconds) : elapsedSeconds;
    return (
      <section aria-label="Focus timer" className="rounded-xl border border-pepper-500/40 bg-pepper-500/5 p-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div
            role="timer"
            aria-live="off"
            aria-label={`${isPaused ? 'Paused, ' : ''}${countdown ? 'time left' : 'elapsed'} ${formatClock(shown)}`}
            className={`font-mono font-extrabold ${compact ? 'text-xl' : 'text-3xl'} text-pepper-400 leading-none`}
          >
            {formatClock(shown)}
          </div>
          <p className="text-xs text-text-muted truncate mt-1">
            {isPaused ? 'Paused' : 'Focusing'} · {activeSession.workspaceName}
          </p>
        </div>
        {isPaused ? (
          <button type="button" onClick={resumeFocus} aria-label="Resume focus timer" className="p-2 rounded-lg bg-pepper-500 text-white hover:bg-pepper-600">
            <Play className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={pauseFocus} aria-label="Pause focus timer" className="p-2 rounded-lg border border-border text-text-primary hover:bg-surface-hover">
            <Pause className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={() => completeFocus()}
          aria-label="Finish focus session now"
          title="Finish and save"
          className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
        >
          <Square className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={cancelFocus}
          aria-label="Cancel focus session"
          className="text-xs font-semibold text-text-muted hover:text-red-500"
        >
          Cancel
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Focus timer" className="rounded-xl border border-border bg-surface-card p-3 flex items-center gap-2">
      <button
        type="button"
        onClick={start}
        disabled={starting}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-pepper-500 hover:bg-pepper-600 text-white text-xs font-bold disabled:opacity-60"
      >
        <Timer className="w-4 h-4" aria-hidden="true" />
        <span>Start {minutes}:00 focus</span>
      </button>
      <div role="radiogroup" aria-label="Focus length in minutes" className="flex rounded-lg border border-border overflow-hidden">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={minutes === m}
            onClick={() => setMinutes(m)}
            className={`px-2 py-2 text-xs font-bold font-mono ${minutes === m ? 'bg-pepper-500/15 text-pepper-400' : 'text-text-muted hover:text-text-primary'}`}
          >
            {m}
          </button>
        ))}
      </div>
    </section>
  );
};
