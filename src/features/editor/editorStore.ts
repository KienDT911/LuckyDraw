import { create } from 'zustand';
import { useCampaign } from '../../shared/store';
import type { Campaign } from '../../types';

const HISTORY_LIMIT = 80;
const COALESCE_MS = 800;

interface EditorState {
  selectedId: string | null;
  past: Campaign[];
  future: Campaign[];
  lastKey: string;
  lastAt: number;
  select: (id: string | null) => void;
  /** Record the current state before a change. Repeated calls with the same key are merged. */
  snapshot: (key?: string) => void;
  undo: () => void;
  redo: () => void;
}

export const useEditor = create<EditorState>((set, get) => ({
  selectedId: null,
  past: [],
  future: [],
  lastKey: '',
  lastAt: 0,

  select: (selectedId) => set({ selectedId }),

  snapshot: (key = '') => {
    const now = Date.now();
    const s = get();
    if (key && key === s.lastKey && now - s.lastAt < COALESCE_MS) {
      set({ lastAt: now });
      return;
    }
    const current = useCampaign.getState().campaign;
    set({ past: [...s.past, current].slice(-HISTORY_LIMIT), future: [], lastKey: key, lastAt: now });
  },

  undo: () => {
    const { past, future } = get();
    const prev = past.at(-1);
    if (!prev) return;
    const current = useCampaign.getState().campaign;
    useCampaign.getState().replace(prev);
    set({ past: past.slice(0, -1), future: [current, ...future], lastKey: '' });
  },

  redo: () => {
    const { past, future } = get();
    const next = future[0];
    if (!next) return;
    const current = useCampaign.getState().campaign;
    useCampaign.getState().replace(next);
    set({ past: [...past, current], future: future.slice(1), lastKey: '' });
  },
}));
