import { useFormatters } from '@/hooks/use-formatters';
import { useNow } from '@/hooks/use-now';

/** "3 minutes ago", with the exact date and time on hover and in the `datetime` attribute. */
export function RelativeTime({ value, className }: { value: string; className?: string }) {
  const format = useFormatters();
  const now = useNow();
  return (
    <time dateTime={value} title={format.dateTime(value)} className={className}>
      {format.relativeTime(value, now)}
    </time>
  );
}
