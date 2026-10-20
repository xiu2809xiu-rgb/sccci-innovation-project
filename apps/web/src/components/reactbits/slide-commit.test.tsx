import { act, fireEvent, render, screen } from '@testing-library/react';
import { animate } from 'motion/react';
import type * as Motion from 'motion/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SlideCommit } from './slide-commit';

// The springs and the failure shake are Motion animations; counting them is enough here.
const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  useReducedMotion: () => motion.reduce,
  animate: vi.fn(),
}));

const LABELS = {
  label: 'Slide to apply',
  armedLabel: 'Tap again to apply',
  workingLabel: 'Applying…',
  doneLabel: 'Applied',
  errorLabel: 'Could not apply',
};

function setup(onConfirm: () => unknown = () => Promise.resolve()) {
  const confirm = vi.fn(onConfirm);
  const { unmount } = render(<SlideCommit {...LABELS} onConfirm={confirm} />);
  return { slider: screen.getByRole('slider', { name: 'Slide to apply' }), confirm, unmount };
}

/** Lets the confirmation promise settle and the minimum spinner time pass. */
async function settle(ms = 400) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

function tap(target: Element, pointerId: number) {
  fireEvent.pointerDown(target, { pointerId, button: 0, clientX: 20 });
  fireEvent.pointerUp(target, { pointerId, button: 0, clientX: 20 });
}

describe('SlideCommit', () => {
  beforeEach(() => {
    motion.reduce = false;
    vi.mocked(animate).mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('arms on the first Enter and commits on the second', async () => {
    const { slider, confirm } = setup();
    fireEvent.keyDown(slider, { key: 'Enter' });
    expect(slider).toHaveAttribute('aria-valuetext', 'Tap again to apply');
    expect(confirm).not.toHaveBeenCalled();

    fireEvent.keyDown(slider, { key: 'Enter' });
    await settle();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(slider).toHaveAttribute('aria-valuetext', 'Applied');
  });

  it('commits on two taps for pointers that cannot drag', async () => {
    const { slider, confirm } = setup();
    tap(slider, 1);
    expect(slider).toHaveAttribute('aria-valuetext', 'Tap again to apply');
    tap(slider, 2);
    await settle();
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('disarms when the second tap does not come within four seconds', async () => {
    const { slider, confirm } = setup();
    fireEvent.keyDown(slider, { key: ' ' });
    await settle(4000);
    expect(slider).toHaveAttribute('aria-valuetext', 'Slide to apply');
    fireEvent.keyDown(slider, { key: ' ' });
    expect(slider).toHaveAttribute('aria-valuetext', 'Tap again to apply');
    expect(confirm).not.toHaveBeenCalled();
  });

  it('shows the failure, then lets the user try again', async () => {
    const { slider, confirm } = setup(() => Promise.reject(new Error('preview expired')));
    fireEvent.keyDown(slider, { key: 'End' });
    await settle();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(slider).toHaveAttribute('aria-valuetext', 'Could not apply');
    await settle(2000);
    expect(slider).toHaveAttribute('aria-valuetext', 'Slide to apply');
  });

  it('springs when it arms, but jumps and never shakes under reduced motion', async () => {
    const moving = setup();
    fireEvent.keyDown(moving.slider, { key: 'Enter' });
    expect(animate).toHaveBeenCalled();
    moving.unmount();

    vi.mocked(animate).mockClear();
    motion.reduce = true;
    const { slider } = setup(() => Promise.reject(new Error('preview expired')));
    fireEvent.keyDown(slider, { key: 'Enter' });
    expect(slider).toHaveAttribute('aria-valuetext', 'Tap again to apply');
    fireEvent.keyDown(slider, { key: 'Enter' });
    await settle();
    expect(slider).toHaveAttribute('aria-valuetext', 'Could not apply');
    expect(animate).not.toHaveBeenCalled();
  });

  it('ignores input while disabled', () => {
    const confirm = vi.fn();
    render(<SlideCommit {...LABELS} onConfirm={confirm} disabled />);
    const slider = screen.getByRole('slider', { name: 'Slide to apply' });
    expect(slider).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(confirm).not.toHaveBeenCalled();
  });
});
