import { Body, Controller, Get, Param, Put, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  accessMatrixSchema,
  changeTransferStatusSchema,
  classificationEntrySchema,
  dataEnvelopeSchema,
  governanceListQuerySchema,
  listEnvelopeSchema,
  retentionPolicySchema,
  transferEntrySchema,
  type AccessMatrix,
  type ChangeTransferStatus,
  type ClassificationEntry,
  type DataEnvelope,
  type GovernanceListQuery,
  type ListEnvelope,
  type RetentionPolicy,
  type TransferEntry,
} from '@huitong/shared';
import type { Request } from 'express';
import { z } from 'zod';

import { RequirePermissions } from '../../common/decorators/route-metadata.js';
import { requestMeta } from '../../common/http/request-meta.js';
import { GovernanceService } from './governance.service.js';

const transferParams = z.object({ transferId: z.uuid() });

/** The access matrix, data classification, transfer register and retention (area 4): real data. */
@ApiTags('governance')
@Controller('governance')
export class GovernanceController {
  constructor(private readonly governance: GovernanceService) {}

  @Get('access')
  @RequirePermissions(['governance:read'])
  @ApiOperation({ summary: "Each role's permissions and clearance, as the API enforces them now" })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(accessMatrixSchema) })
  access(): DataEnvelope<AccessMatrix> {
    return { data: this.governance.accessMatrix() };
  }

  @Get('classifications')
  @RequirePermissions(['governance:read'])
  @ApiOperation({ summary: 'Every classified field, with its level and why' })
  @ApiOkResponse({ standardSchema: listEnvelopeSchema(classificationEntrySchema) })
  async classifications(
    @Query({ schema: governanceListQuerySchema }) query: GovernanceListQuery,
  ): Promise<ListEnvelope<ClassificationEntry>> {
    const { items, total } = await this.governance.classifications(query);
    return { data: items, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  @Get('transfers')
  @RequirePermissions(['governance:read'])
  @ApiOperation({
    summary: 'The cross-border transfer register, with the fields each entry shares while ACTIVE',
  })
  @ApiOkResponse({ standardSchema: listEnvelopeSchema(transferEntrySchema) })
  async transfers(
    @Query({ schema: governanceListQuerySchema }) query: GovernanceListQuery,
  ): Promise<ListEnvelope<TransferEntry>> {
    const { items, total } = await this.governance.transfers(query);
    return { data: items, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  @Put('transfers/:transferId/status')
  @RequirePermissions(['governance:manage'])
  @ApiOperation({
    summary:
      'Approve, suspend or expire an entry, audited, and reload the access policy. Answers 501 NOT_IMPLEMENTED until area 4 builds it',
  })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(transferEntrySchema) })
  async changeTransferStatus(
    @Param({ schema: transferParams }) { transferId }: z.infer<typeof transferParams>,
    @Body({ schema: changeTransferStatusSchema }) body: ChangeTransferStatus,
    @Req() req: Request,
  ): Promise<DataEnvelope<TransferEntry>> {
    return {
      data: await this.governance.changeTransferStatus(transferId, body, requestMeta(req)),
    };
  }

  @Get('retention')
  @RequirePermissions(['governance:read'])
  @ApiOperation({ summary: 'How long each kind of data is kept, and what happens to it then' })
  @ApiOkResponse({ standardSchema: listEnvelopeSchema(retentionPolicySchema) })
  async retention(
    @Query({ schema: governanceListQuerySchema }) query: GovernanceListQuery,
  ): Promise<ListEnvelope<RetentionPolicy>> {
    const { items, total } = await this.governance.retention(query);
    return { data: items, meta: { page: query.page, pageSize: query.pageSize, total } };
  }
}
