import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type * as Motion from 'motion/react';

import { BlurText } from './blur-text';

const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  useReducedMotion: () => motion.reduce,
}));

describe('BlurText', () => {
  it('renders the requested element with the full text for assistive tech', () => {
    motion.reduce = false;
    render(<BlurText as="h1" text="Connect every HR system" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Connect every HR system' }),
    ).toBeInTheDocument();
  });

  it('splits Chinese into word segments so the line can wrap', () => {
    motion.reduce = false;
    const { container } = render(<BlurText text="连接新加坡与中国总部" />);
    const groups = container.querySelectorAll('span.inline-flex');
    expect(groups.length).toBeGreaterThan(1);
  });

  it('shows plain, fully visible text under reduced motion', () => {
    motion.reduce = true;
    const { container } = render(<BlurText as="h2" text="Approvals that trigger work" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Approvals that trigger work');
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
