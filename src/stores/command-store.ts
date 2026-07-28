import { create } from 'zustand';

interface CommandState {
  isOpen: boolean;
  searchQuery: string;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  setSearchQuery: (query: string) => void;
}

export const useCommandStore = create<CommandState>((set) => ({
  isOpen: false,
  searchQuery: '',
  openPalette: () => set({ isOpen: true }),
  closePalette: () => set({ isOpen: false, searchQuery: '' }),
  togglePalette: () => set((state) => ({ isOpen: !state.isOpen })),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
}));
