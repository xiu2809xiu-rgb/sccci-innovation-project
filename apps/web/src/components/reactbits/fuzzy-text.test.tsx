import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FuzzyText } from './fuzzy-text';

describe('FuzzyText', () => {
  beforeEach(() => {
    // jsdom has no 2D canvas; the component must cope without one.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  it('is decorative by default', () => {
    const { container } = render(<FuzzyText>404</FuzzyText>);
    expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('becomes a labelled image when the text carries meaning', () => {
    render(<FuzzyText ariaLabel="Error 404">404</FuzzyText>);
    expect(screen.getByRole('img', { name: 'Error 404' })).toBeInTheDocument();
  });
});
