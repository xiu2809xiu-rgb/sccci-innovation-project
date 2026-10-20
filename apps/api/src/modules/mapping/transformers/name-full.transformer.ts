import type { TransformSpec } from '@huitong/shared';

import { parseFamilyGiven } from './family-given-name.js';
import {
  asText,
  fail,
  ok,
  type FieldTransformer,
  type TransformInput,
} from './field-transformer.js';

/** A whole `FAMILY Given` name in normal capitals, family first or given first. */
export class NameFullTransformer implements FieldTransformer<'name-full'> {
  readonly kind = 'name-full';

  apply(spec: Extract<TransformSpec, { kind: 'name-full' }>, { value }: TransformInput) {
    const text = asText(value);
    const name = text === null ? null : parseFamilyGiven(text);
    if (!name) return fail('not a FAMILY Given name');
    return ok(
      spec.order === 'FAMILY_FIRST'
        ? `${name.family} ${name.given}`
        : `${name.given} ${name.family}`,
    );
  }
}
