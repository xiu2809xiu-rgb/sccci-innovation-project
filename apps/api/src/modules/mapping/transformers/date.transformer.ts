import type { DateFormat, TransformSpec } from '@huitong/shared';

import {
  asText,
  fail,
  ok,
  type FieldTransformer,
  type TransformInput,
} from './field-transformer.js';

interface DateParts {
  year: string;
  month: string;
  day: string;
}

type Order = 'YMD' | 'DMY' | 'MDY';

const LAYOUTS: Record<DateFormat, { regex: RegExp; order: Order }> = {
  'YYYY-MM-DD': { regex: /^(\d{4})-(\d{2})-(\d{2})$/, order: 'YMD' },
  'YYYY/MM/DD': { regex: /^(\d{4})\/(\d{2})\/(\d{2})$/, order: 'YMD' },
  YYYYMMDD: { regex: /^(\d{4})(\d{2})(\d{2})$/, order: 'YMD' },
  'DD/MM/YYYY': { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, order: 'DMY' },
  'MM/DD/YYYY': { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, order: 'MDY' },
  'DD.MM.YYYY': { regex: /^(\d{2})\.(\d{2})\.(\d{4})$/, order: 'DMY' },
};

function partsOf(match: RegExpExecArray, order: Order): DateParts {
  const [, first = '', second = '', third = ''] = match;
  switch (order) {
    case 'YMD':
      return { year: first, month: second, day: third };
    case 'DMY':
      return { year: third, month: second, day: first };
    case 'MDY':
      return { year: third, month: first, day: second };
  }
}

/** True when the parts name a real calendar day (no 30 February). */
function isRealDate({ year, month, day }: DateParts): boolean {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

/** A date in a source's own layout, written as ISO `YYYY-MM-DD`. Spreadsheet dates arrive as Date objects. */
export class DateTransformer implements FieldTransformer<'date'> {
  readonly kind = 'date';

  apply(spec: Extract<TransformSpec, { kind: 'date' }>, { value }: TransformInput) {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime())
        ? fail('not a date')
        : ok(value.toISOString().slice(0, 10));
    }
    const text = asText(value);
    const layout = LAYOUTS[spec.format];
    const match = text === null ? null : layout.regex.exec(text);
    if (!match) return fail(`not a ${spec.format} date`);
    const parts = partsOf(match, layout.order);
    if (!isRealDate(parts)) return fail('not a real calendar date');
    return ok(`${parts.year}-${parts.month}-${parts.day}`);
  }
}
