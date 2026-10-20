import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type * as Motion from 'motion/react';

import { FadeContent } from './fade-content';

const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  useReducedMotion: () => motion.reduce,
}));

describe('FadeContent', () => {
  it('renders its children', () => {
    motion.reduce = false;
    render(
      <FadeContent>
        <p>Sync health</p>
      </FadeContent>,
    );
    expect(screen.getByText('Sync health')).toBeInTheDocument();
  });

  it('leaves content fully visible under reduced motion', () => {
    motion.reduce = true;
    render(
      <FadeContent>
        <p>Pending approvals</p>
      </FadeContent>,
    );
    expect(screen.getByText('Pending approvals')).toBeVisible();
  });
});
