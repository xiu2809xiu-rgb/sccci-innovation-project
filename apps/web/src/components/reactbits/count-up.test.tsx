import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type * as Motion from 'motion/react';

import { CountUp } from './count-up';

const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  useReducedMotion: () => motion.reduce,
}));

describe('CountUp', () => {
  it('always gives screen readers the final value, never a mid-count', () => {
    motion.reduce = false;
    const { container } = render(<CountUp to={1234} separator="," locale="en" />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('1,234');
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('shows only the final value, as plain text, under reduced motion', () => {
    motion.reduce = true;
    const { container } = render(<CountUp to={98} suffix="%" locale="en" />);
    expect(container).toHaveTextContent('98%');
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
