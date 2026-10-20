import { z } from 'zod';

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'] as const;

export const employmentTypeSchema = z.enum(EMPLOYMENT_TYPES);

export type EmploymentType = z.infer<typeof employmentTypeSchema>;

export const EMPLOYMENT_STATUSES = [
  'ACTIVE',
  'PROBATION',
  'ON_LEAVE',
  'TERMINATED',
  'PRE_HIRE',
] as const;

export const employmentStatusSchema = z.enum(EMPLOYMENT_STATUSES);

export type EmploymentStatus = z.infer<typeof employmentStatusSchema>;
