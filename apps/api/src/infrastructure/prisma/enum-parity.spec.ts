import {
  AI_OUTCOMES,
  AI_PROVIDERS,
  CLASSIFICATION_LEVELS,
  CONNECTOR_STATUSES,
  CONNECTOR_TYPES,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  MASK_REASONS,
  ROLES,
  SYNC_RUN_STATUSES,
  SYNC_TRIGGERS,
} from '@huitong/shared';

import {
  AiOutcome,
  AiProvider,
  ConnectorStatus,
  ConnectorType,
  DataClassificationLevel,
  EmploymentStatus,
  EmploymentType,
  MaskReason,
  Role,
  SyncRunStatus,
  SyncTrigger,
} from '../../generated/prisma/client.js';

/** The database enums must list exactly the values of the shared zod enums, in any order. */
describe('Prisma enums match @huitong/shared', () => {
  const cases: [string, readonly string[], Record<string, string>][] = [
    ['Role', ROLES, Role],
    ['EmploymentType', EMPLOYMENT_TYPES, EmploymentType],
    ['EmploymentStatus', EMPLOYMENT_STATUSES, EmploymentStatus],
    ['DataClassificationLevel', CLASSIFICATION_LEVELS, DataClassificationLevel],
    ['MaskReason', MASK_REASONS, MaskReason],
    ['AiProvider', AI_PROVIDERS, AiProvider],
    ['AiOutcome', AI_OUTCOMES, AiOutcome],
    ['ConnectorType', CONNECTOR_TYPES, ConnectorType],
    ['ConnectorStatus', CONNECTOR_STATUSES, ConnectorStatus],
    ['SyncRunStatus', SYNC_RUN_STATUSES, SyncRunStatus],
    ['SyncTrigger', SYNC_TRIGGERS, SyncTrigger],
  ];

  it.each(cases)('%s', (_name, shared, prisma) => {
    expect(Object.values(prisma).sort()).toEqual([...shared].sort());
  });
});
