import { Injectable } from '@nestjs/common';
import {
  canonicalEmployeePartialSchema,
  REALTIME_EVENTS,
  type CanonicalEmployeePartial,
  type ConflictEvent,
  type FieldMapping,
} from '@huitong/shared';

import { AuditLogService } from '../../../infrastructure/audit/audit-log.service.js';
import { RealtimeService } from '../../../infrastructure/events/realtime.service.js';
import { EmployeeMasterService } from '../../employees/employee-master.service.js';
import { MappingEngine } from '../../mapping/mapping-engine.js';
import type { SystemConnector } from '../adapters/system-connector.js';
import { contentHash } from './change-digest.js';
import {
  SyncPipeline,
  type LoadOutcome,
  type Step,
  type SyncContext,
  type SyncSummary,
} from './sync-pipeline.js';
import { SyncProgressReporter } from './sync-progress.reporter.js';

export interface EmployeeSyncContext extends SyncContext {
  connector: SystemConnector;
  mappings: readonly FieldMapping[];
}

interface Extracted {
  externalId: string;
  payload: Record<string, unknown>;
  payloadHash: string;
  observedAt: Date;
}

interface Mapped extends Extracted {
  values: Record<string, unknown>;
}

interface Valid extends Extracted {
  values: CanonicalEmployeePartial;
}

const MAX_MESSAGE = 1000;

/** Employees from one HR system into the canonical master (the Template Method's employee steps). */
@Injectable()
export class EmployeeSyncPipeline extends SyncPipeline<
  Extracted,
  Mapped,
  Valid,
  EmployeeSyncContext
> {
  private readonly policyCache = new Map<string, Promise<Map<string, string | null>>>();

  constructor(
    progress: SyncProgressReporter,
    private readonly engine: MappingEngine,
    private readonly master: EmployeeMasterService,
    private readonly auditLog: AuditLogService,
    private readonly realtime: RealtimeService,
  ) {
    super(progress);
  }

  override async run(context: EmployeeSyncContext): Promise<SyncSummary> {
    this.policyCache.clear();
    return super.run(context);
  }

  protected async extract(context: EmployeeSyncContext): Promise<Extracted[]> {
    const items: Extracted[] = [];
    for await (const page of context.connector.fetchEmployees()) {
      const observedAt = new Date();
      for (const record of page) {
        items.push({
          externalId: record.externalId,
          payload: record.payload,
          payloadHash: contentHash(record.payload),
          observedAt,
        });
      }
    }
    return items;
  }

  protected map(context: EmployeeSyncContext, item: Extracted): Step<Mapped> {
    const { values, issues } = this.engine.map(item.payload, context.mappings);
    if (issues.length > 0) {
      return {
        ok: false,
        failure: {
          externalId: item.externalId,
          stage: 'MAP',
          code: 'MAPPING_FAILED',
          message: issues
            .map((issue) => issue.message)
            .join('; ')
            .slice(0, MAX_MESSAGE),
        },
      };
    }
    return { ok: true, value: { ...item, values } };
  }

  protected validate(_context: EmployeeSyncContext, item: Mapped): Step<Valid> {
    const parsed = canonicalEmployeePartialSchema.safeParse(item.values);
    if (!parsed.success) {
      // zod's messages describe the rule, never the value, so they are safe to store.
      const message = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      return {
        ok: false,
        failure: {
          externalId: item.externalId,
          stage: 'VALIDATE',
          code: 'VALIDATION_FAILED',
          message: message.slice(0, MAX_MESSAGE),
        },
      };
    }
    return { ok: true, value: { ...item, values: parsed.data } };
  }

  protected async load(context: EmployeeSyncContext, item: Valid): Promise<LoadOutcome> {
    const result = await this.master.merge(
      {
        connectorId: context.run.connectorId,
        syncRunId: context.run.id,
        externalId: item.externalId,
        payload: item.payload,
        payloadHash: item.payloadHash,
        values: item.values,
        observedAt: item.observedAt,
      },
      context.run.mode,
      (entityCode) => this.policiesFor(entityCode),
      context.meta,
    );
    switch (result.kind) {
      case 'unchanged':
        return { kind: 'unchanged', conflicts: 0, preview: [] };
      case 'rejected':
        return {
          kind: 'rejected',
          failure: {
            externalId: item.externalId,
            stage: 'LOAD',
            code: result.code,
            message: result.message,
          },
        };
      case 'created':
      case 'updated':
      case 'recorded': {
        // Published after the record's transaction committed; ids only, never values.
        for (const conflict of result.conflicts) {
          if (conflict.conflictId === null) continue;
          const event: ConflictEvent = {
            conflictId: conflict.conflictId,
            employeeNo: conflict.employeeNo,
            field: conflict.field,
          };
          this.realtime.publish(REALTIME_EVENTS.conflictDetected, event);
        }
        return {
          kind: result.kind === 'recorded' ? 'unchanged' : result.kind,
          conflicts: result.conflicts.length,
          preview: result.preview,
          ...(result.kind === 'created' ? { createdHash: contentHash(item.values) } : {}),
        };
      }
    }
  }

  protected async audit(context: EmployeeSyncContext, summary: SyncSummary): Promise<void> {
    await this.auditLog.record(
      {
        action: context.run.mode === 'APPLY' ? 'sync.run.completed' : 'sync.preview.completed',
        entityType: 'SyncRun',
        entityId: context.run.id,
        metadata: { connectorId: context.run.connectorId, counts: summary.counts },
      },
      context.meta,
    );
  }

  private policiesFor(entityCode: string): Promise<Map<string, string | null>> {
    let policies = this.policyCache.get(entityCode);
    if (!policies) {
      policies = this.master.sourcePolicies(entityCode);
      this.policyCache.set(entityCode, policies);
    }
    return policies;
  }
}
