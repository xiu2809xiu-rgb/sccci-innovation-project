import { DEPARTMENTS, type TemplatePreview } from '@huitong/shared';
import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFormatters } from '@/hooks/use-formatters';

const TEXT_COLUMNS = new Set(['employeeNo', 'name', 'entity', 'department']);

/**
 * A month in the company template, column for column, with its labels in the
 * reader's language. Every row links to the employee's record, so the sideways
 * scroll is reachable from the keyboard too.
 */
export function PreviewTable({
  preview,
  periodLabel,
}: {
  preview: TemplatePreview;
  periodLabel: string;
}) {
  const { t, i18n } = useTranslation('attendanceLeave');
  const { t: tCommon } = useTranslation();
  const format = useFormatters();
  const chinese = i18n.language === 'zh-CN';
  const { template } = preview;

  const display = (key: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    if (key === 'entity' && (value === 'SG01' || value === 'CN01' || value === 'MY01')) {
      return tCommon(`entities.${value}`);
    }
    if (key === 'department') {
      const department = DEPARTMENTS.find((candidate) => candidate.code === value);
      if (department) return chinese ? department.nameZh : department.nameEn;
    }
    return typeof value === 'number' ? format.number(value, { maximumFractionDigits: 1 }) : value;
  };

  return (
    <Table>
      <TableCaption className="sr-only">
        {t('template.caption', {
          template: chinese ? template.nameZh : template.name,
          period: periodLabel,
        })}
      </TableCaption>
      <TableHeader>
        <TableRow>
          {template.columns.map((column) => (
            <TableHead
              key={column.key}
              scope="col"
              className={
                TEXT_COLUMNS.has(column.key) ? 'whitespace-nowrap' : 'text-right whitespace-nowrap'
              }
            >
              {chinese ? column.labelZh : column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {preview.rows.map((row) => (
          <TableRow key={row.employeeNo}>
            {template.columns.map((column) =>
              column.key === 'employeeNo' ? (
                <TableCell key={column.key} className="whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <Link
                      to={`/employees?employee=${row.employeeNo}`}
                      className="rounded-sm font-medium text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {row.employeeNo}
                    </Link>
                    {row.exceptionCount > 0 ? (
                      <>
                        <TriangleAlert aria-hidden="true" className="size-3.5 text-warning" />
                        <span className="sr-only">
                          {t('template.exceptions', { count: row.exceptionCount })}
                        </span>
                      </>
                    ) : null}
                  </span>
                </TableCell>
              ) : (
                <TableCell
                  key={column.key}
                  className={
                    TEXT_COLUMNS.has(column.key)
                      ? 'whitespace-nowrap'
                      : 'text-right whitespace-nowrap text-muted-foreground tabular-nums'
                  }
                >
                  {display(column.key, row.values[column.key])}
                </TableCell>
              ),
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
