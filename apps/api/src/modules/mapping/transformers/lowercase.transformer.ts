import {
  asText,
  fail,
  ok,
  type FieldTransformer,
  type TransformInput,
} from './field-transformer.js';

/** Lower case, so `Mei.Ling@ORGE.example` and `mei.ling@orge.example` are the same address. */
export class LowercaseTransformer implements FieldTransformer<'lowercase'> {
  readonly kind = 'lowercase';

  apply(_spec: unknown, { value }: TransformInput) {
    const text = asText(value);
    return text === null ? fail('expected text') : ok(text.toLocaleLowerCase('en'));
  }
}
