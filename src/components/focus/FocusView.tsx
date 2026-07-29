import React, { useState } from 'react';
import { useFocusStore } from '../../stores/focus-store';
import { useSessionStore } from '../../stores/session-store';
import { FocusMode } from '../../core/types/focus-session';
import { PepperSession } from '../../core/types/session';
import { Logo } from '../brand/Logo';
import { Play, Pause, Square, CheckCircle2, Timer, Clock, StopCircle, Layers, Sparkles } from 'lucide-react';

export const FocusView: React.FC = () => {
  const { sessions } = useSessionStore();
  const {
    activeSession,
    activeMemory,
    isRunning,
    isPaused,
    elapsedSeconds,
    startFocus,
    pauseFocus,
    resumeFocus,
    completeFocus,
    cancelFocus,
  } = useFocusStore();

  const [selectedMode, setSelectedMode] = useState<FocusMode>('pomodoro');
  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || '');

  const targetMemory = sessions.find((s) => s.id === selectedSessionId) || sessions[0];

  const handleStart = () => {
    if (!targetMemory) return;
    startFocus(targetMemory, selectedMode, selectedMinutes);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // If a session is active
  if (isRunning && activeSession && activeMemory) {
    const targetSecs = activeSession.durationSeconds || 1;
    const remainingSecs = Math.max(0, targetSecs - elapsedSeconds);
    const displaySecs = activeSession.mode === 'stopwatch' ? elapsedSeconds : remainingSecs;
    const progressPercent = activeSession.mode === 'stopwatch'
      ? 100
      : Math.min(100, Math.round((elapsedSeconds / targetSecs) * 100));

    return (
      <div className="space-y-8 max-w-3xl mx-auto py-6 animate-slide-up text-center select-none">
        {/* Active Focus Header */}
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-pepper-400 px-3 py-1 rounded-full bg-pepper-500/10 border border-pepper-500/20 inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active Focus Engine &bull; {activeSession.mode.toUpperCase()}</span>
          </span>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {activeMemory.name}
          </h2>
          <p className="text-xs text-text-secondary font-medium">
            Project: <span className="text-pepper-400 font-bold">{activeMemory.projectName || 'General'}</span> &bull; {activeMemory.tabCount} Tabs Attached
          </p>
        </div>

        {/* Glowing Circular Timer Component */}
        <div className="relative w-72 h-72 mx-auto flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-surface-card stroke-current"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-pepper-500 stroke-current transition-all duration-1000 ease-linear"
              strokeWidth="6"
              strokeDasharray={276}
              strokeDashoffset={276 - (276 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
            <Logo size={36} state={isPaused ? 'normal' : 'saving'} />
            <div className="text-4xl font-extrabold font-mono text-white tracking-tight pt-2">
              {formatTime(displaySecs)}
            </div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              {isPaused ? 'PAUSED' : activeSession.mode === 'stopwatch' ? 'ELAPSED WORK' : 'REMAINING'}
            </span>
          </div>
        </div>

        {/* Pomodoro Round Indicator */}
        {activeSession.mode === 'pomodoro' && (
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-text-muted">
            <span>
              Round {activeSession.pomodoroRound || 1} of {activeSession.totalRounds || 4}
            </span>
            <div className="flex gap-1.5">
              {Array.from({ length: activeSession.totalRounds || 4 }, (_, i) => i + 1).map((r) => {
                const currentRound = activeSession.pomodoroRound || 1;
                return (
                  <div
                    key={r}
                    className={`w-2.5 h-2.5 rounded-full ${
                      r === currentRound
                        ? 'bg-pepper-500 animate-pulse'
                        : r < currentRound
                        ? 'bg-emerald-500'
                        : 'bg-border'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 pt-2">
          {isPaused ? (
            <button
              onClick={resumeFocus}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-pepper-500 hover:bg-pepper-600 font-bold text-xs text-white transition-all shadow-xl shadow-pepper-500/25 active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Resume Focus</span>
            </button>
          ) : (
            <button
              onClick={pauseFocus}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-surface border border-border hover:bg-surface-hover font-bold text-xs text-text-primary transition-all active:scale-[0.98]"
            >
              <Pause className="w-4 h-4" />
              <span>Pause Timer</span>
            </button>
          )}

          <button
            onClick={() => completeFocus()}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-white transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Complete Session</span>
          </button>

          <button
            onClick={cancelFocus}
            className="p-3 rounded-2xl border border-border hover:bg-surface-hover text-text-muted hover:text-pepper-400 transition-colors"
            title="Cancel Session"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Pre-Focus Selector Screen
  return (
    <div className="space-y-8 max-w-3xl mx-auto py-4 animate-slide-up select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-pepper-500/10 text-pepper-400 border border-pepper-500/20">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-text-primary tracking-tight">Focus System</h2>
            <p className="text-xs text-text-muted">
              Connect Pomodoro, countdown timers, and stopwatches directly to your Workspaces
            </p>
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-surface-card/30 text-text-muted text-xs">
          No workspace memories captured yet. Save a workspace first to start focus sessions.
        </div>
      ) : (
        <div className="bg-surface-card border border-border/80 rounded-3xl p-6 space-y-6 shadow-xl">
          {/* Step 1: Select Target Workspace */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-pepper-500" />
              <span>Target Workspace Memory</span>
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-xs font-semibold text-text-primary focus:outline-none focus:border-pepper-500"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.tabCount} tabs &bull; {s.projectName || 'General'})
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Focus Mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-pepper-500" />
              <span>Choose Focus Mode</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => { setSelectedMode('pomodoro'); setSelectedMinutes(25); }}
                className={`p-4 rounded-2xl border text-left space-y-1 transition-all ${
                  selectedMode === 'pomodoro'
                    ? 'bg-pepper-500/10 border-pepper-500 text-pepper-400'
                    : 'bg-surface border-border/60 text-text-secondary hover:text-text-primary'
                }`}
              >
                <div className="font-bold text-sm flex items-center gap-1.5">
                  <span>🍅 Pomodoro</span>
                </div>
                <p className="text-[11px] text-text-muted">25m work / 5m break interval rounds</p>
              </button>

              <button
                onClick={() => { setSelectedMode('timer'); setSelectedMinutes(45); }}
                className={`p-4 rounded-2xl border text-left space-y-1 transition-all ${
                  selectedMode === 'timer'
                    ? 'bg-pepper-500/10 border-pepper-500 text-pepper-400'
                    : 'bg-surface border-border/60 text-text-secondary hover:text-text-primary'
                }`}
              >
                <div className="font-bold text-sm flex items-center gap-1.5">
                  <span>⏱️ Countdown Timer</span>
                </div>
                <p className="text-[11px] text-text-muted">Set specific target duration countdown</p>
              </button>

              <button
                onClick={() => { setSelectedMode('stopwatch'); setSelectedMinutes(0); }}
                className={`p-4 rounded-2xl border text-left space-y-1 transition-all ${
                  selectedMode === 'stopwatch'
                    ? 'bg-pepper-500/10 border-pepper-500 text-pepper-400'
                    : 'bg-surface border-border/60 text-text-secondary hover:text-text-primary'
                }`}
              >
                <div className="font-bold text-sm flex items-center gap-1.5">
                  <span>⏲️ Stopwatch</span>
                </div>
                <p className="text-[11px] text-text-muted">Open-ended count-up work session</p>
              </button>
            </div>
          </div>

          {/* Step 3: Duration Preset Picker (If Countdown or Pomodoro) */}
          {selectedMode !== 'stopwatch' && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted block">Duration</label>
              <div className="flex gap-2">
                {[15, 25, 30, 45, 60, 90].map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMinutes(m)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-bold font-mono transition-all ${
                      selectedMinutes === m
                        ? 'bg-pepper-500 text-white border-pepper-500'
                        : 'bg-surface border-border/60 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Start Focus CTA */}
          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-pepper-500 hover:bg-pepper-600 text-white font-extrabold text-sm transition-all shadow-xl shadow-pepper-500/25 active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Focus Session ({targetMemory?.name || 'Workspace'})</span>
          </button>
        </div>
      )}
    </div>
  );
};
