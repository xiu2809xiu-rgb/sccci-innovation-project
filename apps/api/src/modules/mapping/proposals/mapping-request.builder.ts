import { LEGAL_ENTITIES, type EntityCode, type Locale } from '@huitong/shared';

import { isCategoricalHeader } from '../../ai/schema-mapping/field-vocabulary.js';
import type { MappingRequest } from '../../ai/schema-mapping/schema-mapping.prompt.js';
import { checkProhibited } from './prohibited-columns.js';
import type { SampleFile } from './sample-file-reader.js';
import { describeColumn } from './sample-shapes.js';

const COUNTRY_DEFAULTS: Record<string, { location: string; phone: string }> = {
  SG: { location: 'SG-SIN', phone: '65' },
  CN: { location: 'CN-SHA', phone: '86' },
  MY: { location: 'MY-KUL', phone: '60' },
};

/**
 * What the server knows about a sample: each column's header and value
 * shapes, the distinct codes of a category column (never a personal value),
 * whether it holds data HuiTong never stores (national ID numbers, gender),
 * and the entity's currency, default location and phone country code. The
 * model is told all of it except the withheld columns (`modelRequestOf`).
 */
export function buildMappingRequest(
  sample: Pick<SampleFile, 'headers' | 'rows'>,
  options: { systemName: string; language: Locale; entityCode: EntityCode | null },
): MappingRequest {
  const entity = LEGAL_ENTITIES.find((candidate) => candidate.code === options.entityCode);
  const defaults = entity ? COUNTRY_DEFAULTS[entity.country] : undefined;
  return {
    systemName: options.systemName,
    language: options.language,
    entity: {
      code: entity?.code ?? null,
      currency: entity?.currency ?? null,
      defaultLocation: defaults?.location ?? null,
      phoneCountryCode: defaults?.phone ?? null,
    },
    columns: sample.headers.map((header) => {
      const values = sample.rows.map((row) => row[header]);
      const { kind } = checkProhibited(header, values);
      const described = describeColumn(
        header,
        values,
        kind === null && isCategoricalHeader(header),
      );
      return {
        header,
        // Not even its shape is kept: nothing about a withheld column leaves the server.
        shape: kind === null ? described.shape : 'withheld',
        categories: kind === null ? described.categories : null,
        withheld: kind,
      };
    }),
  };
}
