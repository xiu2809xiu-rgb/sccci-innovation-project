import type { TransformSpec } from '@huitong/shared';

import {
  asText,
  fail,
  ok,
  type FieldTransformer,
  type TransformInput,
} from './field-transformer.js';

const SCRIPTS = { Han: /\p{Script=Han}/u } as const;

/** Keeps a value only when it is written, at least partly, in the script; otherwise no value. */
export class ContainsScriptTransformer implements FieldTransformer<'contains-script'> {
  readonly kind = 'contains-script';

  apply(spec: Extract<TransformSpec, { kind: 'contains-script' }>, { value }: TransformInput) {
    const text = asText(value);
    if (text === null) return fail('expected text');
    return ok(SCRIPTS[spec.script].test(text) ? text : null);
  }
}
