import { z } from 'zod';

/** OData-style paging, as SAP gateways expose it. */
export const odataPageSchema = z.object({
  $top: z.coerce.number().int().min(1).max(200).default(50),
  $skip: z.coerce.number().int().min(0).default(0),
});

/** Compact `YYYYMMDD` dates in the query string (a different format from the JSON values). */
const compactDate = z
  .string()
  .regex(/^\d{8}$/, 'expected YYYYMMDD')
  .transform((value) => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`)
  .pipe(z.iso.date());

export const compactDateRangeSchema = odataPageSchema
  .extend({ beginDate: compactDate, endDate: compactDate })
  .refine((query) => query.beginDate <= query.endDate, { message: 'beginDate 不能晚于 endDate' });
