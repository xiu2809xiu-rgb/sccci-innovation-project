import { Injectable } from '@nestjs/common';
import type { FieldMapping, MappingProposalStatus } from '@huitong/shared';

import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { jsonColumn } from '../../employees/employees.repository.js';

type Tx = Prisma.TransactionClient;

const WITH_CONFIG = {
  mappingConfig: { select: { id: true, connectorId: true, version: true } },
} as const;

/** AI mapping proposals, and the mapping versions and draft connectors an approval creates. */
@Injectable()
export class MappingProposalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  create(data: Prisma.MappingProposalUncheckedCreateInput) {
    return this.prisma.mappingProposal.create({ data, include: WITH_CONFIG });
  }

  findById(id: string) {
    return this.prisma.mappingProposal.findUnique({ where: { id }, include: WITH_CONFIG });
  }

  async list(status: MappingProposalStatus | undefined, page: number, pageSize: number) {
    const where = status ? { status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.mappingProposal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: WITH_CONFIG,
      }),
      this.prisma.mappingProposal.count({ where }),
    ]);
    return { items, total };
  }

  connectorExists(id: string, tx: Tx | PrismaService = this.prisma) {
    return tx.connector.findUnique({ where: { id }, select: { id: true } });
  }

  createDraftConnector(
    tx: Tx,
    connector: { id: string; name: string; nameZh: string; region: string; entityCode: string },
  ) {
    return tx.connector.create({
      data: {
        ...connector,
        type: 'FILE_IMPORT',
        status: 'DRAFT',
        capabilities: ['employees.import'],
        config: { formats: 'csv,xlsx' },
      },
    });
  }

  /** Archives the connector's ACTIVE version and stores the next one, ACTIVE. */
  async activateVersion(
    tx: Tx,
    version: {
      connectorId: string;
      mappings: readonly FieldMapping[];
      notes: string | null;
      approvedByUserId: string;
      proposalId: string;
    },
  ) {
    const latest = await tx.mappingConfig.findFirst({
      where: { connectorId: version.connectorId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    await tx.mappingConfig.updateMany({
      where: { connectorId: version.connectorId, status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    });
    return tx.mappingConfig.create({
      data: {
        connectorId: version.connectorId,
        version: (latest?.version ?? 0) + 1,
        status: 'ACTIVE',
        mappings: jsonColumn(version.mappings) as Prisma.InputJsonValue,
        notes: version.notes,
        createdByUserId: version.approvedByUserId,
        approvedByUserId: version.approvedByUserId,
        approvedAt: new Date(),
        proposalId: version.proposalId,
      },
    });
  }

  /** Records the review; only a proposal still pending can be decided. */
  async decide(
    tx: Tx | PrismaService,
    id: string,
    decision: {
      status: 'APPROVED' | 'REJECTED';
      reviewedByUserId: string;
      reviewNote: string | null;
    },
  ): Promise<boolean> {
    const { count } = await tx.mappingProposal.updateMany({
      where: { id, status: 'PENDING_REVIEW' },
      data: { ...decision, reviewedAt: new Date() },
    });
    return count === 1;
  }

  usageRecords(ids: readonly string[]) {
    return this.prisma.aiUsageRecord.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, provider: true, model: true },
    });
  }

  displayNames(userIds: readonly string[]) {
    return this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, displayName: true },
    });
  }
}
