import type { TransformSpec } from '@huitong/shared';

import {
  asText,
  fail,
  ok,
  type FieldTransformer,
  type TransformInput,
} from './field-transformer.js';

/** A lookup table: SAP org units to department codes, vendor enums to canonical ones. */
export class ValueMapTransformer implements FieldTransformer<'value-map'> {
  readonly kind = 'value-map';

  apply(spec: Extract<TransformSpec, { kind: 'value-map' }>, { value }: TransformInput) {
    const text = asText(value);
    if (text === null) return fail('expected text or a number');
    const exact = spec.values[text];
    if (exact !== undefined) return ok(exact);
    if (spec.caseInsensitive) {
      const wanted = text.toLocaleLowerCase('en');
      const entry = Object.entries(spec.values).find(
        ([key]) => key.toLocaleLowerCase('en') === wanted,
      );
      if (entry) return ok(entry[1]);
    }
    return fail('not in the value map');
  }
}
