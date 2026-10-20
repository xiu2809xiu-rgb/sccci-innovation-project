import {
  LOW_CONFIDENCE_THRESHOLD,
  type AiMappingOutput,
  type DateFormat,
  type Locale,
  type MappingTarget,
  type ProposalFlag,
  type TransformSpec,
} from '@huitong/shared';

import { CATEGORY_WORDS, FIELD_WORDS, normalise, type FieldWords } from './field-vocabulary.js';
import type { ModelColumn, ModelRequest } from './schema-mapping.prompt.js';

type Column = AiMappingOutput['columns'][number];
type Text = Record<Locale, string>;

const DATE_TARGETS = new Set<MappingTarget>(['hireDate', 'terminationDate', 'dateOfBirth']);

/** Header to candidate fields, best first: an exact synonym beats a partial one. */
function candidates(header: string): { words: FieldWords; score: number }[] {
  const key = normalise(header);
  return FIELD_WORDS.map((words) => {
    if (words.synonyms.includes(key)) return { words, score: 0.95 };
    const partial = words.synonyms.some(
      (synonym) =>
        synonym.length >= 3 && key.length >= 3 && (key.includes(synonym) || synonym.includes(key)),
    );
    return { words, score: partial ? 0.75 : 0 };
  })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Han values decide between the Latin and Chinese versions of a name or a title. */
function fits(target: MappingTarget, column: ModelColumn): boolean {
  const han = column.shape.includes('汉');
  if (target === 'fullNameLocal' || target === 'jobTitleZh') return han;
  if (
    target === 'fullNameLatin' ||
    target === 'jobTitle' ||
    target === 'familyName' ||
    target === 'givenName'
  )
    return !han;
  return true;
}

function dateFormat(shape: string): { format: DateFormat; sure: boolean } {
  if (shape.startsWith('date cell') || shape.includes('####-##-##'))
    return { format: 'YYYY-MM-DD', sure: true };
  if (shape.includes('####/##/##')) return { format: 'YYYY/MM/DD', sure: true };
  if (shape.includes('##.##.####')) return { format: 'DD.MM.YYYY', sure: true };
  if (shape.startsWith('########')) return { format: 'YYYYMMDD', sure: true };
  if (shape.includes('##/##/####')) {
    if (shape.includes('month first')) return { format: 'MM/DD/YYYY', sure: true };
    return { format: 'DD/MM/YYYY', sure: shape.includes('day first') };
  }
  return { format: 'YYYY-MM-DD', sure: false };
}

interface Choice {
  transform: TransformSpec;
  note: Text;
  review: boolean;
}

function transformFor(target: MappingTarget, column: ModelColumn, request: ModelRequest): Choice {
  const none: Text = { en: '', 'zh-CN': '' };
  if (DATE_TARGETS.has(target)) {
    const { format, sure } = dateFormat(column.shape);
    return {
      transform: { kind: 'date', format },
      note: {
        en: `Values look like ${column.shape}, so they are read as ${format} and stored as ISO dates.`,
        'zh-CN': `数值形如 ${column.shape}，按 ${format} 读取并存为 ISO 日期。`,
      },
      review: !sure,
    };
  }
  if (target === 'workEmail') {
    return {
      transform: { kind: 'lowercase' },
      note: { en: 'Addresses are stored in lower case.', 'zh-CN': '邮箱地址统一存为小写。' },
      review: false,
    };
  }
  if (target === 'workPhone') {
    const code = request.entity.phoneCountryCode ?? '65';
    return {
      transform: { kind: 'phone', defaultCountryCode: code },
      note: {
        en: `Numbers are rewritten in E.164 with country code +${code}.`,
        'zh-CN': `号码改写为 E.164 格式，国家代码 +${code}。`,
      },
      review: false,
    };
  }
  if (target === 'fullNameLocal') {
    return {
      transform: { kind: 'contains-script', script: 'Han' },
      note: {
        en: 'Kept only where the name is written in Chinese characters.',
        'zh-CN': '仅保留以汉字书写的姓名。',
      },
      review: false,
    };
  }
  if (target === 'baseSalary.amount') {
    return {
      transform: { kind: 'number' },
      note: { en: 'Amounts are read as numbers.', 'zh-CN': '金额按数字读取。' },
      review: false,
    };
  }
  if (target === 'bankAccountLast4') {
    return {
      transform: { kind: 'last-four-digits' },
      note: {
        en: 'Only the last four digits are kept; the full account number is never stored.',
        'zh-CN': '仅保留后四位，完整账号绝不存储。',
      },
      review: false,
    };
  }
  return valueMapFor(target, column) ?? { transform: { kind: 'copy' }, note: none, review: false };
}

/** Category columns become a value map from the categories the sample shows. */
function valueMapFor(target: MappingTarget, column: ModelColumn): Choice | null {
  const vocabulary = CATEGORY_WORDS[target];
  if (!vocabulary) return null;
  if (!column.categories) {
    return {
      transform: { kind: 'copy' },
      note: {
        en: 'The values must be canonical codes already; add a value map if they are not.',
        'zh-CN': '数值须已是标准代码；如不是，请补充值映射。',
      },
      review: true,
    };
  }
  const values: Record<string, string> = {};
  for (const category of column.categories) {
    const canonical = vocabulary[normalise(category)];
    if (canonical) values[category] = canonical;
  }
  const known = Object.entries(values);
  const listed = known
    .slice(0, 4)
    .map(([from, to]) => `${from} → ${to}`)
    .join(', ');
  const complete = known.length === column.categories.length;
  return {
    transform: { kind: 'value-map', values, caseInsensitive: true },
    note: {
      en: `The values map to canonical codes: ${listed}${complete ? '.' : '; some values are not recognised yet.'}`,
      'zh-CN': `数值映射为标准代码：${listed}${complete ? '。' : '；部分数值尚未识别。'}`,
    },
    review: !complete,
  };
}

function rationale(
  column: ModelColumn,
  words: FieldWords,
  score: number,
  choice: Choice,
  language: Locale,
): string {
  const match =
    language === 'zh-CN'
      ? `表头“${column.header}”${score >= 0.9 ? '即' : '看起来是'}${words.label['zh-CN']}。`
      : `The header "${column.header}" ${score >= 0.9 ? 'means' : 'looks like'} ${words.label.en}.`;
  return `${match} ${choice.note[language]}`.trim();
}

const NO_MATCH: Text = {
  en: 'No canonical field matches this column; leave it unmapped or choose one.',
  'zh-CN': '没有匹配的标准字段；可保持不映射或手动选择。',
};

/**
 * The deterministic stand-in for a language model on the schema-mapping
 * feature: header words in three languages, value shapes for transforms, and
 * the same answer every time, with no API key.
 */
export function mockSchemaMapping(request: ModelRequest): AiMappingOutput {
  const used = new Set<MappingTarget>();
  const columns: Column[] = request.columns.map((column) => {
    const best = candidates(column.header).find(
      ({ words }) => !used.has(words.target) && fits(words.target, column),
    );
    if (!best) {
      return {
        sourceColumn: column.header,
        target: null,
        transform: null,
        confidence: 0,
        rationale: NO_MATCH[request.language],
        flags: ['NO_MATCH'],
      };
    }
    used.add(best.words.target);
    const choice = transformFor(best.words.target, column, request);
    const confidence = Math.round((choice.review ? best.score * 0.7 : best.score) * 100) / 100;
    const flags: ProposalFlag[] = [];
    if (confidence < LOW_CONFIDENCE_THRESHOLD) flags.push('LOW_CONFIDENCE');
    if (choice.review) flags.push('REVIEW_TRANSFORM');
    return {
      sourceColumn: column.header,
      target: best.words.target,
      transform: choice.transform,
      confidence,
      rationale: rationale(column, best.words, best.score, choice, request.language),
      flags,
    };
  });

  const fixedValues: AiMappingOutput['fixedValues'] = [];
  const zh = request.language === 'zh-CN';
  const { code, currency, defaultLocation } = request.entity;
  if (code && !used.has('entityCode')) {
    fixedValues.push({
      target: 'entityCode',
      value: code,
      rationale: zh
        ? `该文件来自 ${request.systemName}，属于法人实体 ${code}。`
        : `The file comes from ${request.systemName}, which belongs to ${code}.`,
    });
  }
  if (used.has('baseSalary.amount') && !used.has('baseSalary.currency')) {
    const salaryHeader =
      columns.find((column) => column.target === 'baseSalary.amount')?.sourceColumn ?? '';
    const named = /\(([A-Z]{3})\)/.exec(salaryHeader)?.[1] ?? currency;
    if (named) {
      fixedValues.push({
        target: 'baseSalary.currency',
        value: named,
        rationale: zh
          ? `工资列未单独给出币种，取 ${named}。`
          : `The salary column has no currency of its own, so ${named} is used.`,
      });
    }
  }
  if (defaultLocation && !used.has('workLocation')) {
    fixedValues.push({
      target: 'workLocation',
      value: defaultLocation,
      rationale: zh
        ? `文件没有工作地点列，取该实体的默认地点 ${defaultLocation}。`
        : `The file has no location column, so the entity's default location ${defaultLocation} is used.`,
    });
  }
  return { columns, fixedValues };
}
