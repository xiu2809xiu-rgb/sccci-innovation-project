import {
  asText,
  fail,
  ok,
  type FieldTransformer,
  type TransformInput,
} from './field-transformer.js';

/** The value as it is, with text trimmed. */
export class CopyTransformer implements FieldTransformer<'copy'> {
  readonly kind = 'copy';

  apply(_spec: unknown, { value }: TransformInput) {
    const text = asText(value);
    if (text === null) return fail('expected text or a number');
    return ok(typeof value === 'number' ? value : text);
  }
}
