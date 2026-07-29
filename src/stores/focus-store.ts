import { create } from 'zustand';
import { FocusSession, FocusMode, UserReflection } from '../core/types/focus-session';
import { PepperSession } from '../core/types/session';
import { focusEngine } from '../core/engines/focus-engine';

interface FocusStoreState {
  activeSession: FocusSession | null;
  activeMemory: PepperSession | null;
  isRunning: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  timerIntervalId: any | null;

  // Session completion modal state
  completedSessionForModal: FocusSession | null;

  // Actions
  startFocus: (memory: PepperSession, mode: FocusMode, targetMinutes?: number) => Promise<void>;
  pauseFocus: () => void;
  resumeFocus: () => void;
  completeFocus: (reflection?: UserReflection, notes?: string) => Promise<void>;
  cancelFocus: () => void;
  clearCompletedModal: () => void;
}

export const useFocusStore = create<FocusStoreState>((set, get) => ({
  activeSession: null,
  activeMemory: null,
  isRunning: false,
  isPaused: false,
  elapsedSeconds: 0,
  timerIntervalId: null,
  completedSessionForModal: null,

  startFocus: async (memory: PepperSession, mode: FocusMode, targetMinutes: number = 25) => {
    // Clear any existing timer
    const existingInterval = get().timerIntervalId;
    if (existingInterval) clearInterval(existingInterval);

    const session = await focusEngine.startSession(memory, mode, targetMinutes);

    const interval = setInterval(() => {
      const { isRunning, isPaused, elapsedSeconds, activeSession } = get();
      if (isRunning && !isPaused && activeSession) {
        const nextElapsed = elapsedSeconds + 1;
        set({ elapsedSeconds: nextElapsed });

        // Auto-complete if countdown timer reaches target
        if (
          activeSession.mode !== 'stopwatch' &&
          activeSession.durationSeconds > 0 &&
          nextElapsed >= activeSession.durationSeconds
        ) {
          get().completeFocus();
        }
      }
    }, 1000);

    set({
      activeSession: session,
      activeMemory: memory,
      isRunning: true,
      isPaused: false,
      elapsedSeconds: 0,
      timerIntervalId: interval,
    });
  },

  pauseFocus: () => {
    const { activeSession, elapsedSeconds } = get();
    if (activeSession) {
      focusEngine.pauseSession(activeSession.id, elapsedSeconds);
      set({ isPaused: true });
    }
  },

  resumeFocus: () => {
    set({ isPaused: false });
  },

  completeFocus: async (reflection?: UserReflection, notes?: string) => {
    const { activeSession, elapsedSeconds, timerIntervalId } = get();
    if (timerIntervalId) clearInterval(timerIntervalId);

    if (activeSession) {
      const completed = await focusEngine.completeSession(
        activeSession.id,
        elapsedSeconds,
        reflection,
        notes
      );

      set({
        activeSession: null,
        activeMemory: null,
        isRunning: false,
        isPaused: false,
        elapsedSeconds: 0,
        timerIntervalId: null,
        completedSessionForModal: completed,
      });
    }
  },

  cancelFocus: () => {
    const { activeSession, elapsedSeconds, timerIntervalId } = get();
    if (timerIntervalId) clearInterval(timerIntervalId);

    if (activeSession) {
      focusEngine.cancelSession(activeSession.id, elapsedSeconds);
    }

    set({
      activeSession: null,
      activeMemory: null,
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      timerIntervalId: null,
    });
  },

  clearCompletedModal: () => {
    set({ completedSessionForModal: null });
  },
}));
