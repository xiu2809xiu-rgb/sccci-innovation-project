import {
  asText,
  fail,
  ok,
  type FieldTransformer,
  type TransformInput,
} from './field-transformer.js';

/** The last four digits only: the master never holds a full bank account number. */
export class LastFourDigitsTransformer implements FieldTransformer<'last-four-digits'> {
  readonly kind = 'last-four-digits';

  apply(_spec: unknown, { value }: TransformInput) {
    const digits = (asText(value) ?? '').replace(/\D/g, '');
    return digits.length >= 4 ? ok(digits.slice(-4)) : fail('fewer than four digits');
  }
}
