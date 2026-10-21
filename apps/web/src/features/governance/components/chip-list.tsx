/** Short labels as chips, so names that hold commas (such as "HR, Singapore") never run together. */
export function ChipList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item} className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground">
          {item}
        </li>
      ))}
    </ul>
  );
}
