import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sparkles } from 'lucide-react';
import type * as Motion from 'motion/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CallChip, type CallChipProps } from './call-chip';

const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  useReducedMotion: () => motion.reduce,
}));

const STATUS_TEXT = { idle: 'waiting', running: 'running', done: 'done', error: 'failed' };

function chip(props: Partial<CallChipProps>) {
  return (
    <CallChip
      icon={<Sparkles />}
      name="Propose mapping"
      argument="my-payroll.csv"
      status="idle"
      statusText={STATUS_TEXT}
      formatElapsed={(ms) => `${String(ms)} ms`}
      {...props}
    />
  );
}

describe('CallChip', () => {
  beforeEach(() => {
    motion.reduce = false;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shakes once on failure, and never under reduced motion', () => {
    const animate = vi.spyOn(HTMLElement.prototype, 'animate');
    const { rerender } = render(chip({ status: 'running' }));
    rerender(chip({ status: 'error' }));
    expect(animate).toHaveBeenCalledTimes(1);

    animate.mockClear();
    motion.reduce = true;
    rerender(chip({ status: 'running' }));
    rerender(chip({ status: 'error' }));
    expect(animate).not.toHaveBeenCalled();
  });

  it('announces the call and how it ended', () => {
    const { rerender } = render(chip({ status: 'running' }));
    expect(screen.getByRole('status')).toHaveTextContent('Propose mapping my-payroll.csv: running');
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');

    rerender(chip({ status: 'done' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      /Propose mapping my-payroll\.csv: done, \d+ ms/,
    );
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-busy');
  });

  it('offers a retry once the call fails', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(chip({ status: 'running' }));
    rerender(chip({ status: 'error', retryLabel: 'Ask the AI again', onRetry }));
    expect(screen.getByRole('status')).toHaveTextContent('Propose mapping my-payroll.csv: failed');

    await user.click(screen.getByRole('button', { name: 'Ask the AI again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
