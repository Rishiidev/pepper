import { create } from 'zustand';
import { PepperSession, GroupedTimeline, SessionStats } from '../core/types/session';
import { sessionEngine } from '../core/engines/session-engine';
import { workspaceEngine } from '../core/engines/workspace-engine';
import { restoreEngine } from '../core/engines/restore-engine';
import { timelineEngine } from '../core/engines/timeline-engine';
import { searchEngine } from '../core/engines/search-engine';
import { eventBus } from '../core/events/event-bus';

interface SessionState {
  sessions: PepperSession[];
  filteredSessions: PepperSession[];
  timeline: GroupedTimeline;
  stats: SessionStats | null;
  searchQuery: string;
  selectedProject: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSessions: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedProject: (project: string | null) => void;
  saveWorkspace: (customName?: string) => Promise<PepperSession | null>;
  restoreSession: (id: string, tabIndices?: number[]) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => {
  // Listen for in-process event bus updates
  eventBus.on('session:created', () => get().fetchSessions());
  eventBus.on('session:updated', () => get().fetchSessions());
  eventBus.on('session:deleted', () => get().fetchSessions());
  eventBus.on('session:restored', () => get().fetchSessions());

  // Listen for cross-context Chrome storage updates (Service Worker -> Manager / Popup UI)
  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.pepper_last_updated) {
        get().fetchSessions();
      }
    });
  }

  return {
    sessions: [],
    filteredSessions: [],
    timeline: { pinned: [], today: [], yesterday: [], this_week: [], older: [] },
    stats: null,
    searchQuery: '',
    selectedProject: null,
    isLoading: false,
    error: null,

    fetchSessions: async () => {
      set({ isLoading: true, error: null });
      try {
        const sessions = await sessionEngine.getAllSessions();
        const stats = await sessionEngine.getStats();
        const filtered = searchEngine.search(sessions, {
          query: get().searchQuery,
          projectFilter: get().selectedProject || undefined,
        });
        const timeline = timelineEngine.groupSessions(filtered);

        set({
          sessions,
          filteredSessions: filtered,
          timeline,
          stats,
          isLoading: false,
        });
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    setSearchQuery: (query: string) => {
      set({ searchQuery: query });
      const { sessions, selectedProject } = get();
      const filtered = searchEngine.search(sessions, {
        query,
        projectFilter: selectedProject || undefined,
      });
      const timeline = timelineEngine.groupSessions(filtered);
      set({ filteredSessions: filtered, timeline });
    },

    setSelectedProject: (project: string | null) => {
      set({ selectedProject: project });
      const { sessions, searchQuery } = get();
      const filtered = searchEngine.search(sessions, {
        query: searchQuery,
        projectFilter: project || undefined,
      });
      const timeline = timelineEngine.groupSessions(filtered);
      set({ filteredSessions: filtered, timeline });
    },

    saveWorkspace: async (customName?: string) => {
      try {
        const session = await workspaceEngine.saveWorkspace(customName);
        if (session) {
          await get().fetchSessions();
        }
        return session;
      } catch (err) {
        console.error('PEPPER: Save workspace failed:', err);
        return null;
      }
    },

    restoreSession: async (id: string, tabIndices?: number[]) => {
      await restoreEngine.restoreSession(id, tabIndices);
    },

    deleteSession: async (id: string) => {
      await sessionEngine.deleteSession(id);
      await get().fetchSessions();
    },

    toggleFavorite: async (id: string) => {
      await sessionEngine.toggleFavorite(id);
      await get().fetchSessions();
    },

    togglePin: async (id: string) => {
      await sessionEngine.togglePin(id);
      await get().fetchSessions();
    },
  };
});
