import type { TransformKind, TransformSpec } from '@huitong/shared';

/** The source value being converted, and the whole record for transforms that read several columns. */
export interface TransformInput {
  value: unknown;
  record: Readonly<Record<string, unknown>>;
}

/**
 * A transform either produces a canonical value or explains why it could not.
 * `reason` never repeats the value itself: the mapping engine decides whether
 * a value may appear in an error, from the target field's classification.
 */
export type TransformResult = { ok: true; value: unknown } | { ok: false; reason: string };

/** One way of turning a source value into a canonical one (Strategy). */
export interface FieldTransformer<K extends TransformKind = TransformKind> {
  readonly kind: K;
  apply(spec: Extract<TransformSpec, { kind: K }>, input: TransformInput): TransformResult;
}

export const ok = (value: unknown): TransformResult => ({ ok: true, value });

export const fail = (reason: string): TransformResult => ({ ok: false, reason });

/** Source values arrive as unknown JSON; this renders scalars as trimmed text and refuses the rest. */
export function asText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}
