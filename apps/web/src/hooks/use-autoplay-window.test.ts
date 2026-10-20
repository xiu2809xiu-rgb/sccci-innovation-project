import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoplayWindow } from './use-autoplay-window';

describe('useAutoplayWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays only while visible, and for at most five seconds', () => {
    const { result, rerender } = renderHook(({ visible }) => useAutoplayWindow(visible), {
      initialProps: { visible: false },
    });
    expect(result.current).toBe(false);

    rerender({ visible: true });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it('opens a fresh window each time the element comes back into view', () => {
    const { result, rerender } = renderHook(({ visible }) => useAutoplayWindow(visible, 1000), {
      initialProps: { visible: true },
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(false);

    rerender({ visible: false });
    expect(result.current).toBe(false);
    rerender({ visible: true });
    expect(result.current).toBe(true);
  });

  it('cancels the previous window when the element leaves view', () => {
    const { result, rerender } = renderHook(({ visible }) => useAutoplayWindow(visible, 1000), {
      initialProps: { visible: true },
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    rerender({ visible: false });
    rerender({ visible: true });
    // 1100 ms after the first appearance: a leftover timer would already have ended this window.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(true);
  });
});
