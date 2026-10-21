import type { AuditEventFilters } from './api/governance-queries';

/** The record types the audit log names, in the order the filter offers them. */
export const AUDIT_ENTITY_TYPES = [
  'Employee',
  'Conflict',
  'Connector',
  'SyncRun',
  'MappingProposal',
  'MappingConfig',
  'InboundWebhookEvent',
  'user',
] as const;

export const isAuditEntityType = (type: string): type is (typeof AUDIT_ENTITY_TYPES)[number] =>
  (AUDIT_ENTITY_TYPES as readonly string[]).includes(type);

/** Action families: an action's first segment, e.g. `conflict` for `conflict.resolved`. */
export const AUDIT_ACTION_FAMILIES = [
  'auth',
  'employee',
  'conflict',
  'mapping',
  'connector',
  'sync',
  'webhook',
  'access',
] as const;

export type AuditActionFamily = (typeof AUDIT_ACTION_FAMILIES)[number];

/** The viewer's filters as the URL holds them; dates are the reader's local calendar days. */
export interface AuditFilterValues {
  entityType: string;
  entityId: string;
  actorUserId: string;
  action: AuditActionFamily | '';
  from: string;
  to: string;
}

const FILTER_KEYS = ['entityType', 'entityId', 'actorUserId', 'action', 'from', 'to'] as const;

export const isAuditActionFamily = (value: string): value is AuditActionFamily =>
  (AUDIT_ACTION_FAMILIES as readonly string[]).includes(value);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function readAuditFilters(params: URLSearchParams): AuditFilterValues {
  const date = (key: 'from' | 'to') => {
    const value = params.get(key) ?? '';
    return ISO_DATE.test(value) ? value : '';
  };
  const action = params.get('action') ?? '';
  return {
    entityType: params.get('entityType')?.trim() ?? '',
    entityId: params.get('entityId')?.trim() ?? '',
    actorUserId: params.get('actorUserId')?.trim() ?? '',
    action: isAuditActionFamily(action) ? action : '',
    from: date('from'),
    to: date('to'),
  };
}

/** The filters written back over the current parameters; the page starts again at 1. */
export function writeAuditFilters(
  current: URLSearchParams,
  values: AuditFilterValues,
): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const key of FILTER_KEYS) {
    if (values[key] === '') next.delete(key);
    else next.set(key, values[key]);
  }
  next.delete('page');
  return next;
}

export const hasAuditFilters = (values: AuditFilterValues): boolean =>
  FILTER_KEYS.some((key) => values[key] !== '');

/** Midnight at the start of a local calendar day, as an instant. */
function startOfLocalDay(date: string, plusDays = 0): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(year, month - 1, day + plusDays).toISOString();
}

/**
 * The filters as the API takes them. A day starts at the reader's local
 * midnight, and `to` includes its whole day, so the API gets the next midnight.
 */
export function toApiFilters(values: AuditFilterValues): AuditEventFilters {
  return {
    entityType: values.entityType || undefined,
    entityId: values.entityId || undefined,
    actorUserId: values.actorUserId || undefined,
    action: values.action ? `${values.action}.` : undefined,
    from: values.from ? startOfLocalDay(values.from) : undefined,
    to: values.to ? startOfLocalDay(values.to, 1) : undefined,
  };
}
