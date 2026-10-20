import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as Motion from 'motion/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Step, Stepper } from './stepper';

const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  useReducedMotion: () => motion.reduce,
}));

function Wizard() {
  const [step, setStep] = useState(1);
  return (
    <Stepper
      step={step}
      onStepChange={setStep}
      aria-label="Mapping steps"
      stepLabel={(number, total, title) => `Step ${String(number)} of ${String(total)}: ${title}`}
      completedContent={<p>Mapping approved</p>}
    >
      <Step title="Upload">
        <button
          type="button"
          onClick={() => {
            setStep(2);
          }}
        >
          Continue
        </button>
      </Step>
      <Step title="Review">
        <button
          type="button"
          onClick={() => {
            setStep(4);
          }}
        >
          Finish
        </button>
      </Step>
      <Step title="Approve">
        <p>Approve the mapping</p>
      </Step>
    </Stepper>
  );
}

const indicator = (name: string) => screen.getByRole('button', { name });

describe('Stepper', () => {
  beforeEach(() => {
    motion.reduce = false;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('slides to the next step, but only cross-fades under reduced motion', async () => {
    const user = userEvent.setup();
    const pane = vi.spyOn(HTMLElement.prototype, 'animate');
    const tick = vi.spyOn(SVGElement.prototype, 'animate');
    const moving = render(<Wizard />);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(JSON.stringify(pane.mock.calls)).toContain('translateX');
    expect(tick).toHaveBeenCalled();
    moving.unmount();

    pane.mockClear();
    tick.mockClear();
    motion.reduce = true;
    render(<Wizard />);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(pane).toHaveBeenCalledWith(
      [{ opacity: 0 }, { opacity: 1 }],
      expect.objectContaining({ duration: 200 }),
    );
    expect(JSON.stringify(pane.mock.calls)).not.toContain('translateX');
    expect(tick).not.toHaveBeenCalled();
  });

  it('lets people return to steps they reached, never skip ahead', async () => {
    const user = userEvent.setup();
    render(<Wizard />);
    expect(indicator('Step 1 of 3: Upload')).toHaveAttribute('aria-current', 'step');
    expect(indicator('Step 2 of 3: Review')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(indicator('Step 2 of 3: Review')).toHaveAttribute('aria-current', 'step');

    await user.click(indicator('Step 1 of 3: Upload'));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(indicator('Step 2 of 3: Review')).toBeEnabled();
    expect(indicator('Step 3 of 3: Approve')).toBeDisabled();
  });

  it('moves focus to the new step, and shows the completed content at the end', async () => {
    const user = userEvent.setup();
    render(<Wizard />);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      screen.getByRole('button', { name: 'Finish' }).parentElement?.parentElement,
    ).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.getByText('Mapping approved')).toBeInTheDocument();
  });
});
