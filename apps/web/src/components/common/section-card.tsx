import { useId, type ReactNode } from 'react';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface SectionCardProps {
  title: string;
  description?: string;
  /** A small secondary action in the header, e.g. "View all". */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/** A titled panel: one region of a page, labelled for screen readers (Gestalt: common region). */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn('min-w-0', className)}>
      <Card className="h-full">
        <CardHeader>
          <CardTitle>
            <h2 id={headingId} className="text-md font-semibold text-foreground">
              {title}
            </h2>
          </CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
        <CardContent className={contentClassName}>{children}</CardContent>
      </Card>
    </section>
  );
}
