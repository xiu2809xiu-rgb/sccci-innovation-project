import { useEffect, useState } from 'react';

/**
 * True while the element is on screen and its tab is showing, so a scene
 * renders frames only when someone can see them. Pass the element from a
 * callback ref, so an element that mounts later is still observed.
 */
export function useInView(element: HTMLElement | null): boolean {
  const [onScreen, setOnScreen] = useState(false);
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState === 'visible');

  useEffect(() => {
    if (!element) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setOnScreen(entry?.isIntersecting ?? false);
    });
    observer.observe(element);
    const onVisibility = () => {
      setTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [element]);

  return onScreen && tabVisible;
}
