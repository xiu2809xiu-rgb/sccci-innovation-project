import { z } from 'zod';

import { errorCodeSchema } from './error-codes.js';

/** The single error shape every API failure uses (CLAUDE.md section 7). */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
    traceId: z.string(),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export const MAX_PAGE_SIZE = 100;

/** `?page=&pageSize=` for every list endpoint. Query strings arrive as text, so values are coerced. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const pageMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
});

export type PageMeta = z.infer<typeof pageMetaSchema>;

/** `{ data }` wrapper for single resources. */
export function dataEnvelopeSchema<T extends z.ZodType>(item: T) {
  return z.object({ data: item });
}

/** `{ data, meta }` wrapper for paginated lists. */
export function listEnvelopeSchema<T extends z.ZodType>(item: T) {
  return z.object({ data: z.array(item), meta: pageMetaSchema });
}

export interface DataEnvelope<T> {
  data: T;
}

export interface ListEnvelope<T> {
  data: T[];
  meta: PageMeta;
}
