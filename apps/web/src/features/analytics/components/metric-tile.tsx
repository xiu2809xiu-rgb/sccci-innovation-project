import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { CountUp } from '@/components/reactbits/count-up';

/** A stat tile: the label, one figure in proportional numerals, and an optional line of context. */
export function MetricTile({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1 rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tracking-tight text-foreground">{children}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** A whole count for a tile, counted up once on load; short (12.4K, 1.2万) from ten thousand. */
export function CountValue({ value }: { value: number }) {
  const { i18n } = useTranslation();
  return (
    <CountUp
      to={value}
      separator=","
      format={value >= 10_000 ? 'compact' : 'standard'}
      decimals={value >= 10_000 ? 1 : 0}
      locale={i18n.language}
      trigger="load"
    />
  );
}
