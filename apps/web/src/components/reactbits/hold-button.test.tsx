import { act, fireEvent, render, screen } from '@testing-library/react';
import type * as Motion from 'motion/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HoldButton } from './hold-button';

const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  useReducedMotion: () => motion.reduce,
}));

function setup() {
  const onHold = vi.fn();
  const onTap = vi.fn();
  render(
    <HoldButton
      holdHint="Press and hold for 1.2 seconds to confirm"
      doneLabel="Resolved"
      onHold={onHold}
      onTap={onTap}
    >
      Hold to resolve
    </HoldButton>,
  );
  return { button: screen.getByRole('button', { name: 'Hold to resolve' }), onHold, onTap };
}

describe('HoldButton', () => {
  beforeEach(() => {
    motion.reduce = false;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads its hint once, as the description', () => {
    const { button } = setup();
    expect(button).toHaveAccessibleName('Hold to resolve');
    expect(button).toHaveAccessibleDescription('Press and hold for 1.2 seconds to confirm');
  });

  it('confirms after a full keyboard hold', () => {
    const { button, onHold, onTap } = setup();
    fireEvent.keyDown(button, { key: ' ' });
    act(() => {
      vi.advanceTimersByTime(1300);
    });
    fireEvent.keyUp(button, { key: ' ' });
    expect(onHold).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
    expect(button).toHaveAccessibleName('Resolved');
  });

  it('treats a quick press as a tap, never as a confirmation', () => {
    const { button, onHold, onTap } = setup();
    fireEvent.keyDown(button, { key: 'Enter' });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.keyUp(button, { key: 'Enter' });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onHold).not.toHaveBeenCalled();
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(button).toHaveAccessibleName('Hold to resolve');
  });

  it('fades instead of sweeping a wave under reduced motion, and still confirms', () => {
    motion.reduce = true;
    const { button, onHold } = setup();
    expect(button).toHaveAttribute('data-motion', 'still');
    fireEvent.keyDown(button, { key: ' ' });
    act(() => {
      vi.advanceTimersByTime(1300);
    });
    expect(onHold).toHaveBeenCalledTimes(1);
  });

  it('cancels a hold on Escape or when the window loses focus', () => {
    const { button, onHold, onTap } = setup();
    fireEvent.keyDown(button, { key: ' ' });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.keyDown(button, { key: 'Escape' });

    fireEvent.keyDown(button, { key: 'Enter' });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.blur(window);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onHold).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
  });
});
