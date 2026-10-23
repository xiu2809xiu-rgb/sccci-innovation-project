import { describe, expect, it } from 'vitest';

import { safeFileName } from './safe-file-name.js';

describe('safeFileName', () => {
  it('keeps the last part of a path, from either kind of separator', () => {
    expect(safeFileName('C:\\fakepath\\export.csv')).toBe('export.csv');
    expect(safeFileName('/home/hr/export.csv')).toBe('export.csv');
  });

  it('keeps letters in any script, and replaces control and direction characters', () => {
    expect(safeFileName('马来西亚员工导出.csv')).toBe('马来西亚员工导出.csv');
    expect(safeFileName('exp\u202Eort\u0007.csv')).toBe('exp_ort_.csv');
  });

  it('falls back to a plain name when nothing usable is left', () => {
    expect(safeFileName('', 'import')).toBe('import');
    expect(safeFileName('C:\\fakepath\\', 'import')).toBe('import');
  });
});
