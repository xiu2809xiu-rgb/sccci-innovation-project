import { Injectable } from '@nestjs/common';
import type { TransformKind } from '@huitong/shared';

import { ConstantTransformer } from './constant.transformer.js';
import { ContainsScriptTransformer } from './contains-script.transformer.js';
import { CopyTransformer } from './copy.transformer.js';
import { DateTransformer } from './date.transformer.js';
import type { FieldTransformer } from './field-transformer.js';
import { LastFourDigitsTransformer } from './last-four-digits.transformer.js';
import { LowercaseTransformer } from './lowercase.transformer.js';
import { NameFullTransformer } from './name-full.transformer.js';
import { NamePartTransformer } from './name-part.transformer.js';
import { NumberTransformer } from './number.transformer.js';
import { PhoneTransformer } from './phone.transformer.js';
import { RulesTransformer } from './rules.transformer.js';
import { ValueMapTransformer } from './value-map.transformer.js';

type Registry = { [K in TransformKind]: FieldTransformer<K> };

/** Finds the Strategy for a transform kind. Adding a kind means adding one class here. */
@Injectable()
export class TransformerRegistry {
  private readonly transformers: Registry = {
    copy: new CopyTransformer(),
    date: new DateTransformer(),
    'value-map': new ValueMapTransformer(),
    'name-part': new NamePartTransformer(),
    'name-full': new NameFullTransformer(),
    phone: new PhoneTransformer(),
    number: new NumberTransformer(),
    'last-four-digits': new LastFourDigitsTransformer(),
    lowercase: new LowercaseTransformer(),
    'contains-script': new ContainsScriptTransformer(),
    constant: new ConstantTransformer(),
    rules: new RulesTransformer(),
  };

  get<K extends TransformKind>(kind: K): FieldTransformer<K> {
    return this.transformers[kind];
  }
}
