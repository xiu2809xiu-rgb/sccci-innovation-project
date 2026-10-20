import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as Motion from 'motion/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThoughtLine } from './thought-line';

const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  useReducedMotion: () => motion.reduce,
}));

const inMs = (milliseconds: number) => `${String(milliseconds)} ms`;
const visibleLabel = (text: string) => screen.getByText(text, { selector: 'span[aria-hidden]' });

describe('ThoughtLine', () => {
  beforeEach(() => {
    motion.reduce = false;
  });

  it('shimmers while it works, and not at all under reduced motion', () => {
    const { unmount } = render(
      <ThoughtLine label="Comparing the systems…" doneLabel="Explained in" working />,
    );
    expect(visibleLabel('Comparing the systems…')).toHaveClass('thought-line-shimmer');
    unmount();

    motion.reduce = true;
    render(<ThoughtLine label="Comparing the systems…" doneLabel="Explained in" working />);
    expect(visibleLabel('Comparing the systems…')).not.toHaveClass('thought-line-shimmer');
    expect(screen.getByRole('status')).toHaveTextContent('Comparing the systems…');
  });

  it('announces the work, then the duration the caller measured', () => {
    const { rerender } = render(
      <ThoughtLine
        label="Comparing the systems…"
        doneLabel="Explained in"
        working
        formatElapsed={inMs}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Comparing the systems…');

    rerender(
      <ThoughtLine
        label="Comparing the systems…"
        doneLabel="Explained in"
        working={false}
        formatElapsed={inMs}
        elapsedMs={38}
      />,
    );
    // A 38 ms call would read 0 on the line's own 100 ms ticks.
    expect(screen.getByRole('status')).toHaveTextContent('Explained in 38 ms');
  });

  it('opens its trace on request once settled', async () => {
    const user = userEvent.setup();
    render(
      <ThoughtLine
        label="Reading the sample…"
        doneLabel="Read in"
        working={false}
        steps={['Found 5 columns', 'Withheld 1 national ID column']}
      />,
    );
    const toggle = screen.getByRole('button', { name: /Read in/ });
    const trace = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(trace).toHaveAttribute('inert');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(trace).not.toHaveAttribute('inert');
    expect(trace).toHaveTextContent('Withheld 1 national ID column');
  });
});
