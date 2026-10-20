import type { TransformSpec } from '@huitong/shared';

import { parseFamilyGiven } from './family-given-name.js';
import {
  asText,
  fail,
  ok,
  type FieldTransformer,
  type TransformInput,
} from './field-transformer.js';

/** The family or the given part of a `FAMILY Given` name. */
export class NamePartTransformer implements FieldTransformer<'name-part'> {
  readonly kind = 'name-part';

  apply(spec: Extract<TransformSpec, { kind: 'name-part' }>, { value }: TransformInput) {
    const text = asText(value);
    const name = text === null ? null : parseFamilyGiven(text);
    if (!name) return fail('not a FAMILY Given name');
    return ok(spec.part === 'family' ? name.family : name.given);
  }
}
