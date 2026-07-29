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
  timerIntervalId: ReturnType<typeof setInterval> | null;

  // Wall-clock anchoring state (BUG-01 fix)
  _startedAtWallClock: number | null;
  _pausedAtWallClock: number | null;
  _totalPausedMs: number;

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

const syncFocusToStorage = async (data: {
  activeSession: FocusSession | null;
  activeMemory: PepperSession | null;
  isRunning: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  _startedAtWallClock: number | null;
  _pausedAtWallClock: number | null;
  _totalPausedMs: number;
}) => {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      await chrome.storage.local.set({ pepper_active_focus_state: data });
    } catch {
      // Non-extension env
    }
  }
};

export const useFocusStore = create<FocusStoreState>((set, get) => {
  // Listen for cross-context Chrome storage updates for Focus state
  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.pepper_active_focus_state) {
        const newState = changes.pepper_active_focus_state.newValue;
        if (newState) {
          const current = get();
          if (newState.isRunning && !current.timerIntervalId) {
            const interval = setInterval(() => {
              const { isRunning, isPaused, activeSession, _startedAtWallClock, _totalPausedMs } = get();
              if (isRunning && !isPaused && activeSession && _startedAtWallClock !== null) {
                const nextElapsed = Math.floor((Date.now() - _startedAtWallClock - _totalPausedMs) / 1000);
                set({ elapsedSeconds: nextElapsed });

                if (
                  activeSession.mode !== 'stopwatch' &&
                  activeSession.durationSeconds > 0 &&
                  nextElapsed >= activeSession.durationSeconds
                ) {
                  get().completeFocus();
                }
              }
            }, 1000);
            set({ ...newState, timerIntervalId: interval });
          } else if (!newState.isRunning && current.timerIntervalId) {
            clearInterval(current.timerIntervalId);
            set({ ...newState, timerIntervalId: null });
          } else {
            set({
              activeSession: newState.activeSession,
              activeMemory: newState.activeMemory,
              isRunning: newState.isRunning,
              isPaused: newState.isPaused,
              elapsedSeconds: newState.elapsedSeconds,
              _startedAtWallClock: newState._startedAtWallClock,
              _pausedAtWallClock: newState._pausedAtWallClock,
              _totalPausedMs: newState._totalPausedMs,
            });
          }
        }
      }
    });

    // Hydrate initial focus state from storage
    chrome.storage.local.get('pepper_active_focus_state').then((res) => {
      const saved = res.pepper_active_focus_state;
      if (saved && saved.isRunning && saved.activeSession) {
        const current = get();
        if (!current.isRunning) {
          const interval = setInterval(() => {
            const { isRunning, isPaused, activeSession, _startedAtWallClock, _totalPausedMs } = get();
            if (isRunning && !isPaused && activeSession && _startedAtWallClock !== null) {
              const nextElapsed = Math.floor((Date.now() - _startedAtWallClock - _totalPausedMs) / 1000);
              set({ elapsedSeconds: nextElapsed });

              if (
                activeSession.mode !== 'stopwatch' &&
                activeSession.durationSeconds > 0 &&
                nextElapsed >= activeSession.durationSeconds
              ) {
                get().completeFocus();
              }
            }
          }, 1000);
          set({ ...saved, timerIntervalId: interval });
        }
      }
    }).catch(() => {});
  }

  return {
    activeSession: null,
    activeMemory: null,
    isRunning: false,
    isPaused: false,
    elapsedSeconds: 0,
    timerIntervalId: null,
    _startedAtWallClock: null,
    _pausedAtWallClock: null,
    _totalPausedMs: 0,
    completedSessionForModal: null,

    startFocus: async (memory: PepperSession, mode: FocusMode, targetMinutes: number = 25) => {
      // Clear any existing timer
      const existingInterval = get().timerIntervalId;
      if (existingInterval) clearInterval(existingInterval);

      const session = await focusEngine.startSession(memory, mode, targetMinutes);
      const wallClockStart = Date.now();

      const interval = setInterval(() => {
        const { isRunning, isPaused, activeSession, _startedAtWallClock, _totalPausedMs } = get();
        if (isRunning && !isPaused && activeSession && _startedAtWallClock !== null) {
          const nextElapsed = Math.floor((Date.now() - _startedAtWallClock - _totalPausedMs) / 1000);
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

      const newState = {
        activeSession: session,
        activeMemory: memory,
        isRunning: true,
        isPaused: false,
        elapsedSeconds: 0,
        timerIntervalId: interval,
        _startedAtWallClock: wallClockStart,
        _pausedAtWallClock: null,
        _totalPausedMs: 0,
      };

      set(newState);
      syncFocusToStorage(newState);
    },

    pauseFocus: () => {
      const { activeSession, elapsedSeconds } = get();
      if (activeSession) {
        focusEngine.pauseSession(activeSession.id, elapsedSeconds);
        const updates = { isPaused: true, _pausedAtWallClock: Date.now() };
        set(updates);
        const state = get();
        syncFocusToStorage(state);
      }
    },

    resumeFocus: () => {
      const { _pausedAtWallClock, _totalPausedMs } = get();
      const pauseDuration = _pausedAtWallClock ? Date.now() - _pausedAtWallClock : 0;
      const updates = {
        isPaused: false,
        _pausedAtWallClock: null,
        _totalPausedMs: _totalPausedMs + pauseDuration,
      };
      set(updates);
      const state = get();
      syncFocusToStorage(state);
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

        const clearedState = {
          activeSession: null,
          activeMemory: null,
          isRunning: false,
          isPaused: false,
          elapsedSeconds: 0,
          timerIntervalId: null,
          _startedAtWallClock: null,
          _pausedAtWallClock: null,
          _totalPausedMs: 0,
          completedSessionForModal: completed,
        };

        set(clearedState);
        syncFocusToStorage(clearedState);
      }
    },

    cancelFocus: () => {
      const { activeSession, elapsedSeconds, timerIntervalId } = get();
      if (timerIntervalId) clearInterval(timerIntervalId);

      if (activeSession) {
        focusEngine.cancelSession(activeSession.id, elapsedSeconds);
      }

      const clearedState = {
        activeSession: null,
        activeMemory: null,
        isRunning: false,
        isPaused: false,
        elapsedSeconds: 0,
        timerIntervalId: null,
        _startedAtWallClock: null,
        _pausedAtWallClock: null,
        _totalPausedMs: 0,
      };

      set(clearedState);
      syncFocusToStorage(clearedState);
    },

    clearCompletedModal: () => {
      set({ completedSessionForModal: null });
    },
  };
});
