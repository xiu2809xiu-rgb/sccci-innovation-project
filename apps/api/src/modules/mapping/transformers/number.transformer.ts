import { fail, ok, type FieldTransformer, type TransformInput } from './field-transformer.js';

/** A number, from a number or from text such as `"12,500.00"`. */
export class NumberTransformer implements FieldTransformer<'number'> {
  readonly kind = 'number';

  apply(_spec: unknown, { value }: TransformInput) {
    if (typeof value === 'number') return Number.isFinite(value) ? ok(value) : fail('not a number');
    if (typeof value !== 'string') return fail('expected a number');
    const cleaned = value.trim().replace(/[,\s]/g, '');
    const parsed = cleaned === '' ? Number.NaN : Number(cleaned);
    return Number.isFinite(parsed) ? ok(parsed) : fail('not a number');
  }
}
