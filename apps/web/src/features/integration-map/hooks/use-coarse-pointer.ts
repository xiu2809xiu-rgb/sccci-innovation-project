import { useSyncExternalStore } from 'react';

/** A touch screen as the main pointer: a tablet, where a swipe is expected to scroll the page. */
const COARSE_QUERY = '(pointer: coarse)';

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(COARSE_QUERY);
  media.addEventListener('change', onChange);
  return () => {
    media.removeEventListener('change', onChange);
  };
}

/** True when the main pointer is a finger rather than a mouse or trackpad. */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COARSE_QUERY).matches,
    () => false,
  );
}
