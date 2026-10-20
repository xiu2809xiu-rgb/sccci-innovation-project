import type { TransformSpec } from '@huitong/shared';

import { ok, type FieldTransformer } from './field-transformer.js';

/** A fixed value, for facts a system implies but does not export, such as its legal entity. */
export class ConstantTransformer implements FieldTransformer<'constant'> {
  readonly kind = 'constant';

  apply(spec: Extract<TransformSpec, { kind: 'constant' }>) {
    return ok(spec.value);
  }
}
