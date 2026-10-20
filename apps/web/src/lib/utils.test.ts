import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('keeps the custom type size next to a text colour', () => {
    expect(cn('text-md font-semibold', 'text-foreground')).toBe(
      'text-md font-semibold text-foreground',
    );
    expect(cn('text-md text-muted-foreground')).toBe('text-md text-muted-foreground');
  });

  it('still resolves conflicting sizes, last one wins', () => {
    expect(cn('text-sm', 'text-md')).toBe('text-md');
    expect(cn('text-md', 'text-xs')).toBe('text-xs');
  });
});
