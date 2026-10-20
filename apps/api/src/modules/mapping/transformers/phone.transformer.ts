import type { TransformSpec } from '@huitong/shared';

import {
  asText,
  fail,
  ok,
  type FieldTransformer,
  type TransformInput,
} from './field-transformer.js';

const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * A phone number in E.164: `+65 9123 4567` becomes `+6591234567`. Local
 * numbers get the default country code, without their trunk prefix: Malaysian
 * `012-345 6701` is `+60123456701`.
 */
export class PhoneTransformer implements FieldTransformer<'phone'> {
  readonly kind = 'phone';

  apply(spec: Extract<TransformSpec, { kind: 'phone' }>, { value }: TransformInput) {
    const text = asText(value);
    if (text === null) return fail('expected a phone number');
    const compact = text.replace(/[\s\-().]/g, '');
    const international = compact.startsWith('+')
      ? compact
      : compact.startsWith('00')
        ? `+${compact.slice(2)}`
        : `+${spec.defaultCountryCode}${compact.replace(/^0/, '')}`;
    return E164.test(international) ? ok(international) : fail('not a valid phone number');
  }
}
