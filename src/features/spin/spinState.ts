import { create } from 'zustand';

interface SpinUiState {
  prizeId: string | null;
  running: boolean;
  paused: boolean;
  /** Winner already committed but whose reels are still spinning: hidden from the prize bar. */
  pendingId: number | null;
}

/** Kept outside the page so the chosen prize survives a trip to the results page. */
export const useSpinUi = create<SpinUiState>(() => ({ prizeId: null, running: false, paused: false, pendingId: null }));
