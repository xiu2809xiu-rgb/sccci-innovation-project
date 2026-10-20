import { z } from 'zod';

export const WORK_LOCATION_CODES = ['SG-SIN', 'CN-SHA', 'CN-PEK', 'CN-SZX', 'MY-KUL'] as const;

export const workLocationSchema = z.enum(WORK_LOCATION_CODES);

export type WorkLocation = z.infer<typeof workLocationSchema>;
