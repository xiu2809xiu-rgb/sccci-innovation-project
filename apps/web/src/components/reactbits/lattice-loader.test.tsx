import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type * as Motion from 'motion/react';

import { LatticeLoader } from './lattice-loader';

const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  useReducedMotion: () => motion.reduce,
}));

const labels = {
  label: 'Syncing Singapore HR',
  doneLabel: 'Sync finished',
  errorLabel: 'Sync failed',
};

describe('LatticeLoader', () => {
  it('announces the running state through a status region', () => {
    motion.reduce = false;
    render(<LatticeLoader {...labels} status="working" />);
    expect(screen.getByRole('status')).toHaveTextContent('Syncing Singapore HR');
  });

  it('announces completion and failure in the caller’s words', () => {
    const { rerender } = render(<LatticeLoader {...labels} status="done" />);
    expect(screen.getByRole('status')).toHaveTextContent('Sync finished');
    rerender(<LatticeLoader {...labels} status="error" />);
    expect(screen.getByRole('status')).toHaveTextContent('Sync failed');
  });

  it('renders a still grid under reduced motion', () => {
    motion.reduce = true;
    const { container } = render(<LatticeLoader {...labels} status="working" />);
    const animated = [...container.querySelectorAll<HTMLElement>('span')].filter(
      (cell) => cell.style.animationName !== '' && cell.style.animationName !== 'none',
    );
    expect(animated).toHaveLength(0);
  });
});
