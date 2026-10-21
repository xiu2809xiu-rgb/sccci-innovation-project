import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  auditEventQuerySchema,
  auditEventViewSchema,
  chainVerificationSchema,
  dataEnvelopeSchema,
  listEnvelopeSchema,
  type AuditEventQuery,
  type AuditEventView,
  type ChainVerificationView,
  type DataEnvelope,
  type ListEnvelope,
} from '@huitong/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/route-metadata.js';
import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import { AuditTrailService } from './audit-trail.service.js';

/** The append-only audit log, read-only (area 4): real data. */
@ApiTags('audit')
@Controller('audit')
export class AuditTrailController {
  constructor(private readonly auditTrail: AuditTrailService) {}

  @Get('events')
  @RequirePermissions(['audit:read'])
  @ApiOperation({
    summary:
      'Audit events, newest first: who did what to which record, and which fields changed (never the values)',
  })
  @ApiOkResponse({ standardSchema: listEnvelopeSchema(auditEventViewSchema) })
  async events(
    @Query({ schema: auditEventQuerySchema }) query: AuditEventQuery,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ListEnvelope<AuditEventView>> {
    const { items, total } = await this.auditTrail.events(query, user);
    return { data: items, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  @Get('verify')
  @RequirePermissions(['audit:read'])
  // Recomputes every hash in the log, so it is rate-limited more tightly than other reads.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Recompute the hash chain and report the first event that breaks it' })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(chainVerificationSchema) })
  async verify(): Promise<DataEnvelope<ChainVerificationView>> {
    return { data: await this.auditTrail.verify() };
  }
}
