import { z } from 'zod';

import { paginationQuerySchema } from '../api/envelope.js';
import { permissionSchema } from '../auth/permissions.js';
import { roleSchema } from '../auth/roles.js';
import { entityCodeSchema } from '../org/entities.js';
import { classificationLevelSchema } from './classification.js';

/** One role's row of the live access policy: what it may do, and how far it may see. */
export const roleAccessSchema = z.object({
  role: roleSchema,
  permissions: z.array(permissionSchema),
  /** The role's clearance per entity; a null entity is the rule for every other entity. */
  clearance: z.array(
    z.object({ entityCode: entityCodeSchema.nullable(), maxLevel: classificationLevelSchema }),
  ),
});

export type RoleAccess = z.infer<typeof roleAccessSchema>;

/** The access policy the API enforces right now (area 1's AccessPolicyService). */
export const accessMatrixSchema = z.object({
  permissions: z.array(permissionSchema),
  roles: z.array(roleAccessSchema),
});

export type AccessMatrix = z.infer<typeof accessMatrixSchema>;

/** One classified field: its level and why, as the masking and the transfer register read it. */
export const classificationEntrySchema = z.object({
  id: z.uuid(),
  entityType: z.string(),
  field: z.string(),
  level: classificationLevelSchema,
  description: z.string(),
  descriptionZh: z.string().nullable(),
  isPersonalData: z.boolean(),
  /** PIPL "sensitive personal information", such as financial accounts. */
  isSensitive: z.boolean(),
  updatedAt: z.iso.datetime(),
});

export type ClassificationEntry = z.infer<typeof classificationEntrySchema>;

/** Mirrors the Prisma enum `TransferStatus`. Only ACTIVE entries share fields (default deny). */
export const TRANSFER_STATUSES = ['ACTIVE', 'PENDING_REVIEW', 'SUSPENDED', 'EXPIRED'] as const;

export const transferStatusSchema = z.enum(TRANSFER_STATUSES);

export type TransferStatus = z.infer<typeof transferStatusSchema>;

/** An entry of the cross-border transfer register (PDPA Transfer Limitation, PIPL Art. 38 and 39). */
export const transferEntrySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  nameZh: z.string().nullable(),
  fromEntityCode: entityCodeSchema,
  toEntityCode: entityCodeSchema,
  fromCountry: z.string(),
  toCountry: z.string(),
  dataCategories: z.array(z.string()),
  /** The canonical fields the categories cover, which reach the destination while ACTIVE. */
  fieldsCovered: z.array(z.string()),
  purpose: z.string(),
  legalBasis: z.string(),
  mechanism: z.string(),
  status: transferStatusSchema,
  /** Goes up with every change to what the entry covers. */
  version: z.number().int().min(1),
  approvedAt: z.iso.datetime().nullable(),
  reviewDueAt: z.iso.datetime().nullable(),
  notes: z.string().nullable(),
  updatedAt: z.iso.datetime(),
});

export type TransferEntry = z.infer<typeof transferEntrySchema>;

/** Mirrors the Prisma enum `RetentionAction`. */
export const RETENTION_ACTIONS = ['DELETE', 'ANONYMISE', 'ARCHIVE'] as const;

export const retentionActionSchema = z.enum(RETENTION_ACTIONS);

export type RetentionAction = z.infer<typeof retentionActionSchema>;

export const retentionPolicySchema = z.object({
  id: z.uuid(),
  dataCategory: z.string(),
  /** Null for the group-wide rule. */
  entityCode: entityCodeSchema.nullable(),
  retentionMonths: z.number().int().min(1),
  action: retentionActionSchema,
  legalReference: z.string().nullable(),
  lastAppliedAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
});

export type RetentionPolicy = z.infer<typeof retentionPolicySchema>;

export const governanceListQuerySchema = paginationQuerySchema;

export type GovernanceListQuery = z.infer<typeof governanceListQuerySchema>;

/** Body of `PUT /governance/transfers/:transferId/status`: approved, suspended or expired, with a reason. */
export const changeTransferStatusSchema = z.object({
  status: transferStatusSchema,
  reason: z.string().trim().min(1).max(500),
});

export type ChangeTransferStatus = z.infer<typeof changeTransferStatusSchema>;
