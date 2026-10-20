import {
  mappingSetSchema,
  type FieldMapping,
  type MappingProposal,
  type MappingTarget,
  type TransformSpec,
} from '@huitong/shared';

/** HR's edits to an AI proposal: where each column goes, and which proposed constants to keep. */
export interface MappingDraft {
  /** Source column → target, or null to leave the column out. */
  columns: Readonly<Record<string, MappingTarget | null>>;
  /** Fixed-value target → whether it is kept. */
  constants: Readonly<Partial<Record<MappingTarget, boolean>>>;
}

const isProhibited = (column: MappingProposal['columns'][number]) =>
  column.flags.includes('PROHIBITED_FIELD');

/** The draft that accepts every AI suggestion as it is, except for columns that are never mapped. */
export function draftFromProposal(proposal: MappingProposal): MappingDraft {
  return {
    columns: Object.fromEntries(
      proposal.columns.map((column) => [
        column.sourceColumn,
        column.transform && !isProhibited(column) ? column.target : null,
      ]),
    ),
    constants: Object.fromEntries(proposal.fixedValues.map((fixed) => [fixed.target, true])),
  };
}

/**
 * The transform for a column HR points at `target`: the AI's own when HR kept
 * its target, otherwise a plain copy (the review flags it for a second look).
 */
function transformFor(
  column: MappingProposal['columns'][number],
  target: MappingTarget,
): TransformSpec {
  return column.target === target && column.transform ? column.transform : { kind: 'copy' };
}

/** The mapping set the draft describes, in the order of the sample's columns. */
export function mappingsFromDraft(proposal: MappingProposal, draft: MappingDraft): FieldMapping[] {
  const fromColumns = proposal.columns.flatMap((column) => {
    const target = draft.columns[column.sourceColumn] ?? null;
    // Defence in depth: the API refuses these too.
    if (target === null || isProhibited(column)) return [];
    return [
      {
        target,
        source: column.sourceColumn,
        transform: transformFor(column, target),
        emptyAsNull: true,
      },
    ];
  });
  const fromConstants = proposal.fixedValues.flatMap((fixed) =>
    draft.constants[fixed.target] === true
      ? [
          {
            target: fixed.target,
            source: null,
            transform: { kind: 'constant' as const, value: fixed.value },
            emptyAsNull: true,
          },
        ]
      : [],
  );
  return [...fromColumns, ...fromConstants];
}

/** Columns whose target HR changed from the AI's, so their transform is a plain copy now. */
export function retargetedColumns(proposal: MappingProposal, draft: MappingDraft): Set<string> {
  return new Set(
    proposal.columns
      .filter((column) => {
        const target = draft.columns[column.sourceColumn] ?? null;
        return target !== null && target !== column.target;
      })
      .map((column) => column.sourceColumn),
  );
}

export type DraftProblem =
  | { kind: 'duplicate'; target: MappingTarget }
  | { kind: 'missingEmployeeNo' }
  | { kind: 'salaryIncomplete' }
  | { kind: 'invalid' };

/**
 * What stops the set from being approved, in terms the review screen can
 * explain. The shared contract stays the final word: anything it rejects for
 * another reason is reported as `invalid`.
 */
export function draftProblems(mappings: readonly FieldMapping[]): DraftProblem[] {
  const problems: DraftProblem[] = [];
  const counts = new Map<MappingTarget, number>();
  for (const mapping of mappings) counts.set(mapping.target, (counts.get(mapping.target) ?? 0) + 1);
  for (const [target, count] of counts) {
    if (count > 1) problems.push({ kind: 'duplicate', target });
  }
  if (!counts.has('employeeNo')) problems.push({ kind: 'missingEmployeeNo' });
  if (counts.has('baseSalary.amount') !== counts.has('baseSalary.currency')) {
    problems.push({ kind: 'salaryIncomplete' });
  }
  if (problems.length === 0 && !mappingSetSchema.safeParse(mappings).success) {
    problems.push({ kind: 'invalid' });
  }
  return problems;
}
