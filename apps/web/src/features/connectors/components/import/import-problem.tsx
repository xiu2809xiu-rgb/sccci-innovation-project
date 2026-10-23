import type { ImportProblem } from '@huitong/shared';
import { FileWarning } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFormatters } from '@/hooks/use-formatters';

type NoRowsKept = Extract<ImportProblem, { problem: 'NO_ROWS_KEPT' }>;

/** Why no row could be kept: each reason once, with its first line and how many more rows share it. */
function RowsLeftOut({ problem }: { problem: NoRowsKept }) {
  const { t } = useTranslation('connectors');
  return (
    <>
      <p>{t('detail.import.problem.NO_ROWS_KEPT')}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {problem.reasons.map(({ reason, count, firstLine }) => (
          <li key={reason}>
            {t(`detail.import.rejectedReason.${reason}`, { line: firstLine })}
            {count > 1 ? t('detail.import.problem.moreLikeIt', { count: count - 1 }) : null}
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * A refused file in HR's language, naming the columns, rows or limit at fault
 * (Nielsen: help users recognise, diagnose and recover from errors).
 */
export function ImportProblemMessage({ problem }: { problem: ImportProblem }) {
  const { t } = useTranslation('connectors');
  const format = useFormatters();
  const text = (() => {
    switch (problem.problem) {
      case 'NO_ROWS_KEPT':
        return <RowsLeftOut problem={problem} />;
      case 'COLUMNS_MISSING':
        return t('detail.import.problem.COLUMNS_MISSING', {
          columns: format.list(problem.columns.map((column) => `“${column}”`)),
        });
      case 'PROHIBITED_COLUMN':
        return t(`detail.import.problem.PROHIBITED_COLUMN_${problem.kind}`, {
          column: problem.column,
        });
      case 'FILE_TOO_LARGE':
      case 'WORKBOOK_TOO_LARGE':
        return t(`detail.import.problem.${problem.problem}`, {
          megabytes: format.number(problem.megabytes),
        });
      case 'TOO_MANY_ROWS':
      case 'TOO_MANY_COLUMNS':
      case 'HEADER_TOO_LONG':
        return t(`detail.import.problem.${problem.problem}`, {
          limit: format.number(problem.limit),
        });
      case 'DUPLICATE_HEADER':
        return t('detail.import.problem.DUPLICATE_HEADER', { column: problem.column });
      case 'UNSUPPORTED_TYPE':
      case 'UNREADABLE':
      case 'NO_HEADER_ROW':
      case 'UNNAMED_COLUMN':
      case 'NO_DATA':
        return t(`detail.import.problem.${problem.problem}`);
    }
  })();
  return (
    <Alert className="border-danger-border bg-danger-subtle">
      <FileWarning className="text-danger" aria-hidden="true" />
      <AlertTitle>{t('detail.import.problem.title')}</AlertTitle>
      <AlertDescription className="text-muted-foreground">{text}</AlertDescription>
    </Alert>
  );
}
