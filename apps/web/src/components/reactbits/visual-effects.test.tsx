import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Motion from 'motion/react';

import { Aurora } from './aurora';
import { ShinyText } from './shiny-text';
import { SpotlightCard } from './spotlight-card';
import { StarBorder } from './star-border';
import { StatusMark } from './status-mark';

const motion = vi.hoisted(() => ({ reduce: true }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  useReducedMotion: () => motion.reduce,
}));

// Decorative effects: they must render their content, stay out of the accessibility
// tree, and survive environments without WebGL or a 2D canvas (jsdom has neither).
describe('decorative React Bits effects', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  it('Aurora renders a hidden background without WebGL', () => {
    const { container } = render(<Aurora />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('ShinyText keeps its text readable', () => {
    render(<ShinyText text="Synthetic demo data" />);
    expect(screen.getByText('Synthetic demo data')).toBeInTheDocument();
  });

  it('SpotlightCard renders its children with hidden light layers', () => {
    const { container } = render(
      <SpotlightCard>
        <p>Sign in</p>
      </SpotlightCard>,
    );
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it('StarBorder renders a real button by default and other elements on request', () => {
    const { rerender } = render(<StarBorder>Sign in</StarBorder>);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    rerender(
      <StarBorder as="a" href="/overview">
        Overview
      </StarBorder>,
    );
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/overview');
  });

  it('StatusMark names its state for screen readers', () => {
    const { rerender } = render(<StatusMark status="running" statusText="Syncing" />);
    expect(screen.getByRole('img', { name: 'Syncing' })).toBeInTheDocument();
    rerender(<StatusMark status="done" statusText="Synced" label="Singapore HR" />);
    expect(screen.getByText('Synced')).toHaveClass('sr-only');
  });
});
