import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Badges next to the title, e.g. the synthetic-data label or a classification. */
  meta?: ReactNode;
  /** At most one primary button (CLAUDE.md section 8); secondary actions use outline/ghost. */
  actions?: ReactNode;
  className?: string;
}

/** The top of every page: title, purpose and page-level actions (page anatomy: header, filters, content). */
export function PageHeader({ title, description, meta, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {meta}
        </div>
        {description ? (
          <p className="max-w-prose text-base text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
