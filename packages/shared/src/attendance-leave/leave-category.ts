import { z } from 'zod';

/**
 * The group's canonical leave categories (mirrors the Prisma enum
 * `LeaveCategory`). Each source system's codes map onto these through
 * approved rules, such as 年假 to ANNUAL and 调休 to TIME_OFF_IN_LIEU.
 */
export const LEAVE_CATEGORIES = [
  'ANNUAL',
  'SICK',
  'HOSPITALISATION',
  'CHILDCARE',
  'MATERNITY',
  'PATERNITY',
  'COMPASSIONATE',
  'MARRIAGE',
  'TIME_OFF_IN_LIEU',
  'UNPAID',
  'HOME_LEAVE',
  'OTHER',
] as const;

export const leaveCategorySchema = z.enum(LEAVE_CATEGORIES);

export type LeaveCategory = z.infer<typeof leaveCategorySchema>;
