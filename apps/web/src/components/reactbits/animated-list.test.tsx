import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type * as Motion from 'motion/react';

import { AnimatedList } from './animated-list';

const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  useReducedMotion: () => motion.reduce,
}));

const items = [
  { id: 'a', title: 'Sync completed', description: 'Singapore HR', meta: '2m' },
  { id: 'b', title: 'Conflict detected', description: 'Job title', meta: '5m' },
];

describe('AnimatedList', () => {
  it('renders a labelled list with every entry', () => {
    render(<AnimatedList items={items} aria-label="Recent activity" />);
    const list = screen.getByRole('list', { name: 'Recent activity' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByText('Conflict detected')).toBeInTheDocument();
  });

  it('keeps rows in their start pose until the list scrolls into view', () => {
    motion.reduce = false;
    render(<AnimatedList items={items} aria-label="Recent activity" />);
    for (const row of screen.getAllByRole('listitem')) {
      expect(row).toHaveStyle({ opacity: '0' });
    }
  });

  it('shows every row at rest, with no movement, under reduced motion', () => {
    motion.reduce = true;
    render(<AnimatedList items={items} aria-label="Recent activity" />);
    for (const row of screen.getAllByRole('listitem')) {
      expect(row).not.toHaveAttribute('style');
    }
  });
});
