import { useSyncExternalStore } from 'react';

import { readTokenColor } from '@/lib/css-color';

/** Notifies when the theme class on `<html>` changes. */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => {
    observer.disconnect();
  };
}

/**
 * The resolved value of a colour token, re-read whenever the theme changes.
 * Canvas and WebGL effects pass it to {@link cssColorToRgb} or straight to a 2D context.
 */
export function useTokenColor(name: `--${string}`): string {
  return useSyncExternalStore(
    subscribe,
    () => readTokenColor(name),
    () => '',
  );
}
