import { useEffect, useState } from 'react';

import { AUTOPLAY_LIMIT_MS } from '@/lib/motion-policy';

/**
 * Whether decorative motion may play: true from the moment `visible` turns true until `limitMs`
 * later, then false. Each new appearance opens a fresh window, so scrolling back replays it.
 */
export function useAutoplayWindow(visible: boolean, limitMs = AUTOPLAY_LIMIT_MS): boolean {
  const [expired, setExpired] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);

  // Reset during render when the element reappears, so it never shows one frame of stale state.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setExpired(false);
  }

  useEffect(() => {
    if (!visible) return undefined;
    const timer = window.setTimeout(() => {
      setExpired(true);
    }, limitMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [visible, limitMs]);

  return visible && !expired;
}
