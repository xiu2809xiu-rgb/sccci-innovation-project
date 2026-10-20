import type { FieldMapping } from './field-mapping.js';
import type { ProposalColumn, ProposalFixedValue } from './mapping-proposal.js';

/**
 * The AI's suggestion as a mapping set: every column it matched, with its
 * transform, plus the constants it proposed. The wizard starts HR's review
 * from it, and the API counts HR's edits against it.
 */
export function suggestedMappings(
  columns: readonly ProposalColumn[],
  fixed: readonly ProposalFixedValue[],
): FieldMapping[] {
  return [
    ...columns.flatMap((column) =>
      column.target && column.transform
        ? [
            {
              target: column.target,
              source: column.sourceColumn,
              transform: column.transform,
              emptyAsNull: true,
            },
          ]
        : [],
    ),
    ...fixed.map((value) => ({
      target: value.target,
      source: null,
      transform: { kind: 'constant' as const, value: value.value },
      emptyAsNull: true,
    })),
  ];
}
