import React, { useState } from 'react';
import { Pause, Play, Square, Timer } from 'lucide-react';
import { useFocusStore } from '../../stores/focus-store';
import { getFocusTarget } from '../../core/engines/focus-target';
import { formatClock } from '../../core/engines/focus-timing';
import { Button, IconButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { ProgressRing } from '../ui/ProgressRing';

const PRESETS = [15, 25, 50];

interface Props {
  /** Popup layout: smaller ring */
  compact?: boolean;
  /** Make Start the red primary action (side panel). In the popup, Save is primary instead. */
  primary?: boolean;
}

/** One-click Pomodoro. A mint (focus and time) card with a progress ring. */
export const FocusQuickStart: React.FC<Props> = ({ compact = false, primary = false }) => {
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

  const ringSize = compact ? 64 : 96;

  if (isRunning && activeSession) {
    const countdown = activeSession.mode !== 'stopwatch' && activeSession.durationSeconds > 0;
    const shown = countdown ? Math.max(0, activeSession.durationSeconds - elapsedSeconds) : elapsedSeconds;
    const progress = countdown ? elapsedSeconds / activeSession.durationSeconds : 0;
    return (
      <Card tone="mint" as="section" aria-label="Focus timer" pad="sm" className="flex flex-wrap items-center gap-x-4 gap-y-3" data-testid="focus-card">
        <ProgressRing className="shrink-0" value={progress} size={ringSize} stroke={compact ? 6 : 8} label="Focus progress">
          <Timer className="w-5 h-5" aria-hidden="true" />
        </ProgressRing>
        <div className="min-w-[8.5rem] flex-1">
          <p className="eyebrow opacity-75">{isPaused ? 'Paused' : 'Focusing'}</p>
          <p
            role="timer"
            aria-label={`${isPaused ? 'Paused, ' : ''}${countdown ? 'time left' : 'elapsed'} ${formatClock(shown)}`}
            className={`display-number ${compact ? '!text-[32px]' : ''}`}
          >
            {formatClock(shown)}
          </p>
          <p className="text-xs opacity-80 truncate mt-1 max-w-full">{activeSession.workspaceName}</p>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {isPaused ? (
            <IconButton aria-label="Resume focus timer" onClick={resumeFocus} className="!text-current hover:!bg-black/10">
              <Play className="w-4 h-4" aria-hidden="true" />
            </IconButton>
          ) : (
            <IconButton aria-label="Pause focus timer" onClick={pauseFocus} className="!text-current hover:!bg-black/10">
              <Pause className="w-4 h-4" aria-hidden="true" />
            </IconButton>
          )}
          <IconButton aria-label="Finish focus session now" title="Finish and save" onClick={() => completeFocus()} className="!text-current hover:!bg-black/10">
            <Square className="w-4 h-4" aria-hidden="true" />
          </IconButton>
          <button type="button" onClick={cancelFocus} aria-label="Cancel focus session" className="text-xs font-semibold underline opacity-80 hover:opacity-100">
            Cancel
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card tone="mint" as="section" aria-label="Focus timer" pad="sm" className="flex flex-wrap items-center gap-x-4 gap-y-3" data-testid="focus-card">
      <ProgressRing className="shrink-0" value={0} size={ringSize} stroke={compact ? 6 : 8}>
        <Timer className="w-5 h-5" aria-hidden="true" />
      </ProgressRing>
      <div className="min-w-[8.5rem] flex-1 space-y-2">
        <div>
          <p className="eyebrow opacity-75">Focus</p>
          <p className="display-number !text-[32px]">{minutes}:00</p>
        </div>
        <div role="radiogroup" aria-label="Focus length in minutes" className="inline-flex rounded-full bg-black/10 dark:bg-white/10 p-0.5">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={minutes === m}
              aria-label={`${m} minutes`}
              onClick={() => setMinutes(m)}
              className={`h-7 min-w-9 rounded-full px-2 text-xs font-bold font-mono ${minutes === m ? 'bg-zone-mint-fg text-zone-mint' : 'opacity-80 hover:opacity-100'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <Button className="ml-auto shrink-0" variant={primary ? 'primary' : 'secondary'} onClick={start} disabled={starting} aria-label={`Start ${minutes}:00 focus`}>
        Start
      </Button>
    </Card>
  );
};
