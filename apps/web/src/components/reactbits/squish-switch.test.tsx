import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SquishSwitch } from './squish-switch';

describe('SquishSwitch', () => {
  it('is a named switch that toggles on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SquishSwitch ariaLabel="Share usage analytics" onChange={onChange} />);
    const control = screen.getByRole('switch', { name: 'Share usage analytics' });
    expect(control).toHaveAttribute('aria-checked', 'false');
    await user.click(control);
    expect(control).toHaveAttribute('aria-checked', 'true');
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles with the keyboard', async () => {
    const user = userEvent.setup();
    render(<SquishSwitch label="Reduce motion" />);
    const control = screen.getByRole('switch', { name: 'Reduce motion' });
    control.focus();
    await user.keyboard(' ');
    expect(control).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{Enter}');
    expect(control).toHaveAttribute('aria-checked', 'false');
  });

  it('stays focusable but ignores input while disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SquishSwitch ariaLabel="Locked" disabled onChange={onChange} />);
    await user.click(screen.getByRole('switch', { name: 'Locked' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
