import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Lazy route chunks load through Vite's transform pipeline in tests, which can exceed the 1 s default.
configure({ asyncUtilTimeout: 5000 });

// jsdom lacks these browser APIs; Radix, cmdk, Motion and our theme code use them.
class NoopObserver {
  observe(): void {
    // Nothing to observe in jsdom.
  }
  unobserve(): void {
    // Nothing to observe in jsdom.
  }
  disconnect(): void {
    // Nothing to observe in jsdom.
  }
  takeRecords(): [] {
    return [];
  }
}

if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  });
}

for (const name of ['ResizeObserver', 'IntersectionObserver'] as const) {
  if (!(name in window)) {
    Object.defineProperty(window, name, { writable: true, value: NoopObserver });
  }
}

if (!('scrollIntoView' in Element.prototype)) {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    writable: true,
    value: () => undefined,
  });
}

// The step and chip transitions call the Web Animations API. The stub sits on
// HTMLElement and SVGElement, not Element: Motion detects WAAPI on
// Element.prototype and must keep to its own animation loop in jsdom.
for (const prototype of [HTMLElement.prototype, SVGElement.prototype]) {
  if (!('animate' in prototype)) {
    Object.defineProperty(prototype, 'animate', {
      writable: true,
      value: () => ({
        cancel: () => undefined,
        finish: () => undefined,
        finished: Promise.resolve(),
      }),
    });
  }
}

// HoldButton and SlideCommit capture the pointer on press.
for (const [name, value] of [
  ['setPointerCapture', () => undefined],
  ['releasePointerCapture', () => undefined],
  ['hasPointerCapture', () => false],
] as const) {
  if (!(name in Element.prototype)) {
    Object.defineProperty(Element.prototype, name, { writable: true, value });
  }
}

afterEach(() => {
  cleanup();
});
