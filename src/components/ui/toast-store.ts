import { create } from 'zustand';

export interface ToastItem {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++;
    const item: ToastItem = { id, duration: 6000, ...t };
    set({ toasts: [...get().toasts, item].slice(-3) });
    return id;
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Show a message, optionally with an Undo-style action. */
export const toast = (message: string, opts: { actionLabel?: string; onAction?: () => void | Promise<void>; duration?: number } = {}) =>
  useToastStore.getState().push({ message, ...opts });
