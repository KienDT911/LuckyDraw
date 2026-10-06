import { useSyncExternalStore } from 'react';

/**
 * Bumps whenever web fonts finish loading. Fonts load lazily (only once text uses them), so
 * `document.fonts.ready` can resolve before a face is even requested; layouts that measure text
 * depend on this to re-measure with the real glyphs.
 */
let version = 0;
const listeners = new Set<() => void>();

if (typeof document !== 'undefined' && document.fonts) {
  const bump = () => {
    version++;
    listeners.forEach((l) => l());
  };
  document.fonts.addEventListener('loadingdone', bump);
  void document.fonts.ready.then(bump);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFontsVersion(): number {
  return useSyncExternalStore(subscribe, () => version);
}
