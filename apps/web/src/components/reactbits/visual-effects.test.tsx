import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Motion from 'motion/react';

import { ShinyText } from './shiny-text';
import { SplitAuthLayout } from './split-auth-layout';
import { SpotlightCard } from './spotlight-card';
import { StarBorder } from './star-border';
import { starVelocity } from './star-velocity';
import { StatusMark } from './status-mark';
import { TrustOrbit } from './trust-orbit';

const motion = vi.hoisted(() => ({ reduce: true }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  useReducedMotion: () => motion.reduce,
}));

// Decorative effects: they must render their content, stay out of the accessibility
// tree, and survive environments without WebGL or a 2D canvas (jsdom has neither).
describe('decorative React Bits effects', () => {
  beforeEach(() => {
    motion.reduce = true;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
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

  it('StarBorder brings its star to rest within five seconds unless told otherwise', () => {
    const cruise = 225;
    const dt = 1 / 60;
    const run = (settleAfter: number, seconds: number) => {
      let velocity = 0;
      for (let elapsed = dt; elapsed <= seconds; elapsed += dt) {
        velocity = starVelocity(velocity, cruise, elapsed, settleAfter, dt);
      }
      return velocity;
    };
    expect(run(4, 2)).toBeGreaterThan(cruise * 0.9);
    expect(run(4, 5)).toBe(0);
    expect(run(Number.POSITIVE_INFINITY, 10)).toBeCloseTo(cruise);
  });

  it('StatusMark names its state for screen readers', () => {
    const { rerender } = render(<StatusMark status="running" statusText="Syncing" />);
    expect(screen.getByRole('img', { name: 'Syncing' })).toBeInTheDocument();
    rerender(<StatusMark status="done" statusText="Synced" label="Singapore HR" />);
    expect(screen.getByText('Synced')).toHaveClass('sr-only');
  });

  const splitLayout = (
    <SplitAuthLayout
      heading={<h1>Sign in to HuiTong</h1>}
      footnote={<p>Every sign-in is audited.</p>}
      aside={<p>What HuiTong does</p>}
    >
      <form aria-label="Sign in" />
    </SplitAuthLayout>
  );

  it('SplitAuthLayout keeps the form before the story, all visible at once under reduced motion', () => {
    render(splitLayout);
    const form = screen.getByRole('form', { name: 'Sign in' });
    const aside = screen.getByRole('complementary');
    expect(aside).toHaveTextContent('What HuiTong does');
    expect(form.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in to HuiTong' })).toBeVisible();
    expect(form).toBeVisible();
    expect(screen.getByText('Every sign-in is audited.')).toBeVisible();
  });

  it('SplitAuthLayout fades the form column in when motion is allowed', async () => {
    motion.reduce = false;
    render(splitLayout);
    const heading = screen.getByRole('heading', { level: 1, name: 'Sign in to HuiTong' });
    expect(heading).not.toBeVisible();
    await waitFor(() => {
      expect(heading).toBeVisible();
    });
    await waitFor(() => {
      expect(screen.getByRole('form', { name: 'Sign in' })).toBeVisible();
    });
  });

  it('TrustOrbit lists at most three claims, hides its rings and never moves', () => {
    const { container } = render(
      <TrustOrbit
        centre={<p>Integration map</p>}
        chips={['Role-based access', 'Append-only audit trail', 'Human approval', 'Extra'].map(
          (label) => ({ id: label, label, icon: null }),
        )}
      />,
    );
    expect(screen.getByText('Integration map')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Role-based access',
      'Append-only audit trail',
      'Human approval',
    ]);
    // Four rings and the dashed orbit are decoration only.
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(5);
    // The centrepiece carries the motion; nothing in the orbit is animated or styled inline.
    expect(container.querySelector('[style]')).toBeNull();
  });
});
