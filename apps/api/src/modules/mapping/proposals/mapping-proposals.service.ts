import { Injectable } from '@nestjs/common';
import {
  LEGAL_ENTITIES,
  proposalColumnSchema,
  proposalFixedValueSchema,
  REALTIME_EVENTS,
  type ApproveProposalRequest,
  type CreateProposalFields,
  type FieldMapping,
  type MappingProposal,
  type MappingProposalStatus,
  type ProposalColumn,
  type RejectProposalRequest,
  suggestedMappings,
} from '@huitong/shared';
import { z } from 'zod';

import {
  ConflictError,
  NotFoundError,
  ValidationFailedError,
} from '../../../common/errors/app-error.js';
import type { AuthenticatedUser } from '../../../common/http/authenticated-user.js';
import type { RequestMeta } from '../../../common/http/request-meta.js';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service.js';
import { canonicalJson } from '../../../infrastructure/audit/canonical-json.js';
import { RealtimeService } from '../../../infrastructure/events/realtime.service.js';
import { AiUsageTracker } from '../../../infrastructure/llm/ai-usage.tracker.js';
import { SchemaMappingAssistant } from '../../ai/schema-mapping/schema-mapping.assistant.js';
import { buildMappingRequest } from './mapping-request.builder.js';
import { MappingProposalsRepository } from './mapping-proposals.repository.js';
import { SampleFileReader, type UploadedFile } from './sample-file-reader.js';

const storedSchema = z.object({
  columns: z.array(proposalColumnSchema),
  fixedValues: z.array(proposalFixedValueSchema),
});

type ProposalRow = NonNullable<Awaited<ReturnType<MappingProposalsRepository['findById']>>>;

function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'sample';
  return base.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120) || 'sample';
}

function slug(text: string): string {
  return text
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

/** Mappings HR added, changed or removed compared with the AI's suggestion. */
function countEdits(suggested: readonly FieldMapping[], approved: readonly FieldMapping[]): number {
  const keys = (mappings: readonly FieldMapping[]) =>
    new Set(mappings.map((mapping) => canonicalJson(mapping)));
  const before = keys(suggested);
  const after = keys(approved);
  return (
    [...after].filter((key) => !before.has(key)).length +
    [...before].filter((key) => !after.has(key)).length
  );
}

/**
 * The AI mapping wizard's back end. A sample file goes in, the assistant
 * proposes, and nothing is used until someone with `mappings:approve` approves
 * it: only then is a new, versioned mapping saved (ADR 0011). The sample's
 * values are never stored, only its headers and value shapes.
 */
@Injectable()
export class MappingProposalsService {
  constructor(
    private readonly proposals: MappingProposalsRepository,
    private readonly reader: SampleFileReader,
    private readonly assistant: SchemaMappingAssistant,
    private readonly tracker: AiUsageTracker,
    private readonly audit: AuditLogService,
    private readonly realtime: RealtimeService,
  ) {}

  async propose(
    file: UploadedFile | undefined,
    fields: CreateProposalFields,
    meta: RequestMeta & { actor: AuthenticatedUser },
  ): Promise<MappingProposal> {
    if (!file)
      throw new ValidationFailedError(
        [{ path: 'file', message: 'Attach a sample file' }],
        'Attach a sample file',
      );
    if (fields.connectorId && !(await this.proposals.connectorExists(fields.connectorId))) {
      throw new NotFoundError(`Connector ${fields.connectorId}`);
    }
    const sample = await this.reader.read(file, fields.encoding);
    const request = buildMappingRequest(sample, {
      systemName: fields.sourceSystemName,
      language: fields.language,
      entityCode: fields.entityCode ?? null,
    });
    const suggestion = await this.assistant.propose(request, {
      userId: meta.actor.id,
      requestId: meta.traceId,
    });
    const created = await this.proposals.create({
      connectorId: fields.connectorId ?? null,
      sourceSystemName: fields.sourceSystemName,
      entityCode: fields.entityCode ?? null,
      fileName: safeFileName(file.originalname),
      headers: sample.headers,
      sampleRowCount: sample.rows.length,
      proposals: { columns: suggestion.columns, fixedValues: suggestion.fixedValues },
      aiUsageRecordId: suggestion.usageRecordId,
      language: fields.language,
      createdByUserId: meta.actor.id,
    });
    await this.audit.record(
      {
        action: 'mapping.proposed',
        entityType: 'MappingProposal',
        entityId: created.id,
        metadata: {
          columns: sample.headers.length,
          fileName: created.fileName,
          aiUsageRecordId: suggestion.usageRecordId,
        },
      },
      meta,
    );
    this.realtime.publish(REALTIME_EVENTS.mappingProposed, { proposalId: created.id });
    return this.view(created);
  }

  async get(id: string): Promise<MappingProposal> {
    const proposal = await this.proposals.findById(id);
    if (!proposal) throw new NotFoundError(`Mapping proposal ${id}`);
    return this.view(proposal);
  }

  async list(status: MappingProposalStatus | undefined, page: number, pageSize: number) {
    const { items, total } = await this.proposals.list(status, page, pageSize);
    return { items: await this.views(items), total };
  }

  async approve(
    id: string,
    request: ApproveProposalRequest,
    meta: RequestMeta & { actor: AuthenticatedUser },
  ): Promise<MappingProposal> {
    const proposal = await this.proposals.findById(id);
    if (!proposal) throw new NotFoundError(`Mapping proposal ${id}`);
    if (proposal.status !== 'PENDING_REVIEW')
      throw new ConflictError('This proposal has already been reviewed');
    const stored = storedSchema.parse(proposal.proposals);
    this.checkMappings(request.mappings, proposal.headers, stored.columns);

    const target = request.connector;
    await this.proposals.transaction(async (tx) => {
      let connectorId: string;
      if (target.kind === 'existing') {
        if (!(await this.proposals.connectorExists(target.connectorId, tx))) {
          throw new NotFoundError(`Connector ${target.connectorId}`);
        }
        connectorId = target.connectorId;
      } else {
        connectorId = await this.newConnectorId(target.name, tx);
        const entity = LEGAL_ENTITIES.find((candidate) => candidate.code === target.entityCode);
        await this.proposals.createDraftConnector(tx, {
          id: connectorId,
          name: target.name,
          nameZh: target.nameZh,
          region: entity?.country ?? 'SG',
          entityCode: target.entityCode,
        });
        await this.audit.record(
          {
            action: 'connector.created',
            entityType: 'Connector',
            entityId: connectorId,
            metadata: { status: 'DRAFT', proposalId: id },
          },
          meta,
          tx,
        );
      }
      const config = await this.proposals.activateVersion(tx, {
        connectorId,
        mappings: request.mappings,
        notes: request.note ?? null,
        approvedByUserId: meta.actor.id,
        proposalId: id,
      });
      if (
        !(await this.proposals.decide(tx, id, {
          status: 'APPROVED',
          reviewedByUserId: meta.actor.id,
          reviewNote: request.note ?? null,
        }))
      ) {
        throw new ConflictError('This proposal has already been reviewed');
      }
      const suggested = suggestedMappings(stored.columns, stored.fixedValues);
      await this.audit.record(
        {
          action: 'mapping.approved',
          entityType: 'MappingConfig',
          entityId: config.id,
          metadata: {
            proposalId: id,
            connectorId,
            version: config.version,
            suggested: suggested.length,
            approved: request.mappings.length,
            edits: countEdits(suggested, request.mappings),
          },
        },
        meta,
        tx,
      );
    });
    this.realtime.publish(REALTIME_EVENTS.mappingApproved, { proposalId: id });
    return this.get(id);
  }

  async reject(
    id: string,
    request: RejectProposalRequest,
    meta: RequestMeta & { actor: AuthenticatedUser },
  ): Promise<MappingProposal> {
    const proposal = await this.proposals.findById(id);
    if (!proposal) throw new NotFoundError(`Mapping proposal ${id}`);
    await this.proposals.transaction(async (tx) => {
      if (
        !(await this.proposals.decide(tx, id, {
          status: 'REJECTED',
          reviewedByUserId: meta.actor.id,
          reviewNote: request.note,
        }))
      ) {
        throw new ConflictError('This proposal has already been reviewed');
      }
      await this.audit.record(
        {
          action: 'mapping.rejected',
          entityType: 'MappingProposal',
          entityId: id,
          metadata: { note: request.note },
        },
        meta,
        tx,
      );
    });
    if (proposal.aiUsageRecordId)
      await this.tracker.markOutcome(proposal.aiUsageRecordId, 'REJECTED');
    return this.get(id);
  }

  /** Server-side approval rules, whatever the UI allowed: only the sample's own columns, never a prohibited one. */
  private checkMappings(
    mappings: readonly FieldMapping[],
    headers: readonly string[],
    columns: readonly ProposalColumn[],
  ): void {
    const prohibited = new Set(
      columns
        .filter((column) => column.flags.includes('PROHIBITED_FIELD'))
        .map((column) => column.sourceColumn),
    );
    const problems = mappings.flatMap((mapping, index) => {
      if (mapping.source === null) return [];
      if (prohibited.has(mapping.source)) {
        return [
          {
            path: `mappings.${String(index)}.source`,
            message: `${mapping.source} holds national ID numbers and can never be mapped`,
          },
        ];
      }
      return headers.includes(mapping.source)
        ? []
        : [
            {
              path: `mappings.${String(index)}.source`,
              message: `${mapping.source} is not a column of the sample file`,
            },
          ];
    });
    if (problems.length > 0)
      throw new ValidationFailedError(problems, 'The mapping uses columns it may not use');
  }

  private async newConnectorId(
    name: string,
    tx: Parameters<Parameters<MappingProposalsRepository['transaction']>[0]>[0],
  ): Promise<string> {
    const base = `file-${slug(name) || 'import'}`;
    for (let suffix = 1; suffix < 100; suffix += 1) {
      const id = suffix === 1 ? base : `${base}-${String(suffix)}`;
      if (!(await this.proposals.connectorExists(id, tx))) return id;
    }
    throw new ConflictError('Could not find a free connector id for this system');
  }

  private async view(proposal: ProposalRow): Promise<MappingProposal> {
    const [view] = await this.views([proposal]);
    if (!view) throw new NotFoundError(`Mapping proposal ${proposal.id}`);
    return view;
  }

  private async views(proposals: readonly ProposalRow[]): Promise<MappingProposal[]> {
    const usageIds = proposals.flatMap((proposal) =>
      proposal.aiUsageRecordId ? [proposal.aiUsageRecordId] : [],
    );
    const userIds = [
      ...new Set(
        proposals.flatMap((proposal) =>
          [proposal.createdByUserId, proposal.reviewedByUserId ?? []].flat(),
        ),
      ),
    ];
    const [usage, people] = await Promise.all([
      usageIds.length > 0 ? this.proposals.usageRecords(usageIds) : Promise.resolve([]),
      userIds.length > 0 ? this.proposals.displayNames(userIds) : Promise.resolve([]),
    ]);
    const usageById = new Map(usage.map((record) => [record.id, record]));
    const names = new Map(people.map((person) => [person.id, person.displayName]));
    const ref = (userId: string) => ({ id: userId, displayName: names.get(userId) ?? '' });
    return proposals.map((proposal) => {
      const stored = storedSchema.parse(proposal.proposals);
      const record = proposal.aiUsageRecordId ? usageById.get(proposal.aiUsageRecordId) : undefined;
      return {
        id: proposal.id,
        sourceSystemName: proposal.sourceSystemName,
        entityCode: (proposal.entityCode as MappingProposal['entityCode']) ?? null,
        connectorId: proposal.connectorId,
        fileName: proposal.fileName,
        headers: proposal.headers,
        sampleRowCount: proposal.sampleRowCount,
        columns: stored.columns,
        fixedValues: stored.fixedValues,
        status: proposal.status,
        language: proposal.language === 'zh-CN' ? 'zh-CN' : 'en',
        provider: record?.provider ?? null,
        model: record?.model ?? null,
        createdBy: ref(proposal.createdByUserId),
        createdAt: proposal.createdAt.toISOString(),
        reviewedBy: proposal.reviewedByUserId ? ref(proposal.reviewedByUserId) : null,
        reviewedAt: proposal.reviewedAt?.toISOString() ?? null,
        reviewNote: proposal.reviewNote,
        mappingConfig: proposal.mappingConfig,
      };
    });
  }
}
