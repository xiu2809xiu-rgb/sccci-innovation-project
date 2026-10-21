import type { DiscrepancyRequest } from './discrepancy.prompt.js';

type Candidate = DiscrepancyRequest['candidates'][number];

const day = (iso: string) => iso.slice(0, 10);

/** The two most informative candidates and which of them changed last, when both dates are known. */
function compare(candidates: readonly Candidate[]) {
  const [first, second] = candidates;
  if (!first || !second) return null;
  const newer =
    first.changedAt && second.changedAt && first.changedAt !== second.changedAt
      ? first.changedAt > second.changedAt
        ? { newer: first, older: second }
        : { newer: second, older: first }
      : null;
  return { first, second, newer };
}

function english(request: DiscrepancyRequest): string {
  const pair = compare(request.candidates);
  const { label } = request.field;
  if (!pair)
    return `HuiTong found a disagreement about this employee's ${label}, but only one source holds a value now.`;
  const { first, second, newer } = pair;
  const held = (candidate: Candidate) =>
    `${candidate.system} has ${candidate.value === null ? 'a different value' : `"${candidate.value}"`}${candidate.changedAt ? ` (last changed ${day(candidate.changedAt)})` : ''}`;
  const withheld =
    request.field.withheld === 'NOT_SHARED'
      ? ' The values themselves are not shown here because this field is not shared with your entity.'
      : request.field.withheld === 'IDENTIFIES_A_PERSON'
        ? ' The values themselves are not shown here because they identify the person.'
        : request.field.withheld === 'ABOVE_INTERNAL'
          ? ` The values themselves are not shown here because this field is classified ${request.field.classification.toLowerCase()}.`
          : '';
  const recency = newer
    ? ` ${newer.newer.system} changed more recently, which often means the update has not reached ${newer.older.system} yet.`
    : '';
  return (
    `${first.system} and ${second.system} disagree about this employee's ${label}: ${held(first)}, and ${held(second)}.` +
    withheld +
    recency +
    ` No single system owns this field for ${request.entityCode}, so HR decides. Check the approval or transfer behind the change before choosing; the decision is recorded in the audit trail.`
  );
}

function chinese(request: DiscrepancyRequest): string {
  const pair = compare(request.candidates);
  const { label } = request.field;
  if (!pair) return `汇通发现该员工的「${label}」存在差异，但目前只有一个来源有值。`;
  const { first, second, newer } = pair;
  const held = (candidate: Candidate) =>
    `${candidate.system}${candidate.value === null ? '的值不同' : `为“${candidate.value}”`}${candidate.changedAt ? `（最后修改于 ${day(candidate.changedAt)}）` : ''}`;
  const withheld =
    request.field.withheld === 'NOT_SHARED'
      ? '由于该字段未与您所在的实体共享，此处不显示具体数值。'
      : request.field.withheld === 'IDENTIFIES_A_PERSON'
        ? '由于这些数值可识别员工身份，此处不显示。'
        : request.field.withheld === 'ABOVE_INTERNAL'
          ? '由于该字段属于保密级别，此处不显示具体数值。'
          : '';
  const recency = newer
    ? `${newer.newer.system}的修改更近，通常说明更新尚未同步到${newer.older.system}。`
    : '';
  return (
    `${first.system}与${second.system}中该员工的「${label}」不一致：${held(first)}，${held(second)}。` +
    withheld +
    recency +
    `${request.entityCode} 没有系统单独主管该字段，需由人力资源判断。选择前请先核对变更背后的审批或调动记录；该决定将记入审计日志。`
  );
}

/** The deterministic stand-in for a language model on the discrepancy-explainer feature. */
export function mockExplainDiscrepancy(request: DiscrepancyRequest): string {
  return request.language === 'zh-CN' ? chinese(request) : english(request);
}
