import type { ReactNode } from 'react';

export interface BarTableRow {
  key: string;
  label: ReactNode;
  /** The measure the bar draws. */
  value: number;
  /** The same value, formatted, at the bar's tip. */
  display: string;
  /** Further columns, already formatted. */
  extra?: readonly ReactNode[];
}

/**
 * Categories compared by one measure: a real table whose value column draws a
 * thin bar. One series, so one colour and no legend; the bars share one scale
 * from zero, and the value sits at each bar's tip in text colour.
 */
export function BarTable({
  caption,
  labelHeader,
  valueHeader,
  extraHeaders = [],
  rows,
}: {
  caption: string;
  labelHeader: string;
  valueHeader: string;
  extraHeaders?: readonly string[];
  rows: readonly BarTableRow[];
}) {
  const max = Math.max(...rows.map((row) => row.value), 0);
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="text-xs text-muted-foreground">
          <th scope="col" className="pb-2 text-left font-medium">
            {labelHeader}
          </th>
          <th scope="col" className="w-1/2 pb-2 text-left font-medium">
            {valueHeader}
          </th>
          {extraHeaders.map((header) => (
            <th key={header} scope="col" className="pb-2 pl-3 text-right font-medium">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="group border-t border-border">
            <th
              scope="row"
              className="py-2 pr-3 text-left align-middle font-normal text-foreground"
            >
              {row.label}
            </th>
            <td className="py-2 align-middle">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-3 rounded-e-sm bg-chart-1 transition-opacity group-hover:opacity-80"
                  style={{
                    // Zero draws no bar; anything above it stays visible however small.
                    width: `${String(row.value === 0 ? 0 : Math.max((row.value / max) * 85, 1))}%`,
                  }}
                />
                <span className="text-foreground tabular-nums">{row.display}</span>
              </div>
            </td>
            {(row.extra ?? []).map((cell, index) => (
              <td
                key={extraHeaders[index] ?? index}
                className="py-2 pl-3 text-right align-middle text-muted-foreground tabular-nums"
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
