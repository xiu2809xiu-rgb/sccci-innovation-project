import { useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { useFormatters } from '@/hooks/use-formatters';

export interface DailyColumn<P> {
  label: string;
  value: (point: P) => string;
}

export interface DailyChartProps<P extends { date: string }> {
  /** Names the chart and its table, e.g. "Requests per day". */
  caption: string;
  points: readonly P[];
  /** The one plotted measure, and how its values read. */
  label: string;
  value: (point: P) => number;
  format: (value: number) => string;
  /** More of each day's figures, in the tooltip and the table only. */
  extra?: readonly DailyColumn<P>[];
}

const config = { value: { label: 'value', color: 'var(--chart-1)' } } satisfies ChartConfig;

/**
 * One measure by day as a line with a light wash: one series, so one colour
 * and no legend. A crosshair finds the day, and the tooltip lists every
 * figure for it. The same figures are a real table under "Show as a table",
 * so nothing depends on hovering.
 */
export function DailyChart<P extends { date: string }>({
  caption,
  points,
  label,
  value,
  format,
  extra = [],
}: DailyChartProps<P>) {
  const { t } = useTranslation('analytics');
  const formatters = useFormatters();
  const reducedMotion = useReducedMotion() === true;
  const data = points.map((point) => ({ date: point.date, value: value(point) }));
  const byDate = new Map(points.map((point) => [point.date, point]));

  return (
    <figure className="space-y-3">
      <ChartContainer config={config} className="aspect-auto h-48 w-full">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} title={caption}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={(date: string) => formatters.dayMonth(date)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(tick: number) => formatters.compact(tick)}
          />
          <ChartTooltip
            cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
            content={({ active, label: date }) => {
              const point = typeof date === 'string' ? byDate.get(date) : undefined;
              if (!active || !point) return null;
              return (
                <div className="grid min-w-36 gap-1 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                  <p className="font-medium text-foreground">{formatters.date(point.date)}</p>
                  <p className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span aria-hidden="true" className="h-0.5 w-3 rounded-full bg-chart-1" />
                      {label}
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {format(value(point))}
                    </span>
                  </p>
                  {extra.map((column) => (
                    <p key={column.label} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{column.label}</span>
                      <span className="text-foreground tabular-nums">{column.value(point)}</span>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Area
            dataKey="value"
            type="linear"
            stroke="var(--color-value)"
            strokeWidth={2}
            fill="var(--color-value)"
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
            isAnimationActive={!reducedMotion}
          />
        </AreaChart>
      </ChartContainer>
      <details className="text-sm">
        <summary className="cursor-pointer rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {t('asTable')}
        </summary>
        {/* No inner scroll box: it would hold no focusable element, so the keyboard could not scroll it. */}
        <div className="mt-2 rounded-lg border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-3 py-1.5 text-left font-medium">
                  {t('date')}
                </th>
                <th scope="col" className="px-3 py-1.5 text-right font-medium">
                  {label}
                </th>
                {extra.map((column) => (
                  <th key={column.label} scope="col" className="px-3 py-1.5 text-right font-medium">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date} className="border-t border-border">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    {formatters.date(point.date)}
                  </th>
                  <td className="px-3 py-1.5 text-right tabular-nums">{format(value(point))}</td>
                  {extra.map((column) => (
                    <td key={column.label} className="px-3 py-1.5 text-right tabular-nums">
                      {column.value(point)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
