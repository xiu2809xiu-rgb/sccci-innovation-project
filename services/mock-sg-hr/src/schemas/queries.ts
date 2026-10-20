import { z } from 'zod';

/** `?page=&pageSize=` with this system's own defaults and limits. */
export function pageQuerySchema(defaultSize: number, maxSize: number) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(maxSize).default(defaultSize),
  });
}

export const employeeListQuerySchema = pageQuerySchema(50, 100).extend({
  updatedSince: z.iso.datetime().optional(),
});

export const dateRangeQuerySchema = pageQuerySchema(200, 500)
  .extend({
    from: z.iso.date(),
    to: z.iso.date(),
  })
  .refine((query) => query.from <= query.to, { message: '"from" must not be after "to"' });
