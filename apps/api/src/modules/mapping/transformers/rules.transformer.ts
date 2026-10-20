import type { TransformSpec } from '@huitong/shared';

import {
  asText,
  fail,
  ok,
  type FieldTransformer,
  type TransformInput,
} from './field-transformer.js';

/**
 * The first rule whose columns all hold the given values wins. SAP keeps one
 * employment status in three columns: 雇佣状态 0 means the person has left;
 * otherwise 试用期 or 休假中 set to 是 mean probation or leave.
 */
export class RulesTransformer implements FieldTransformer<'rules'> {
  readonly kind = 'rules';

  apply(spec: Extract<TransformSpec, { kind: 'rules' }>, { record }: TransformInput) {
    const matched = spec.rules.find((rule) =>
      Object.entries(rule.when).every(
        ([column, expected]) => (asText(record[column]) ?? '') === expected,
      ),
    );
    return matched ? ok(matched.value) : fail('no rule matched');
  }
}
