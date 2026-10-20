import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RubberSegment } from './rubber-segment';

const items = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

describe('RubberSegment', () => {
  it('is a named radio group with the current option checked', () => {
    render(<RubberSegment items={items} value="dark" aria-label="Theme" />);
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  });

  it('moves the selection with arrow keys, Home and End', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RubberSegment items={items} defaultValue="light" aria-label="Theme" onChange={onChange} />,
    );
    screen.getByRole('radio', { name: 'Light' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('dark', 1);
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('system', 2);
    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('light', 0);
  });

  it('keeps only the checked option in the tab order', () => {
    render(<RubberSegment items={items} value="system" aria-label="Theme" />);
    const tabbable = screen.getAllByRole('radio').filter((radio) => radio.tabIndex === 0);
    expect(tabbable).toEqual([screen.getByRole('radio', { name: 'System' })]);
  });
});
