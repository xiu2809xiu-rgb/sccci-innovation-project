import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  approveProposalSchema,
  createProposalFieldsSchema,
  mappingProposalStatusSchema,
  paginationQuerySchema,
  rejectProposalSchema,
  type ApproveProposalRequest,
  type CreateProposalFields,
  type RejectProposalRequest,
} from '@huitong/shared';
import type { Request } from 'express';
import { z } from 'zod';

import { UnauthenticatedError } from '../../../common/errors/app-error.js';
import { RequirePermissions } from '../../../common/decorators/route-metadata.js';
import { requestMeta } from '../../../common/http/request-meta.js';
import { MappingProposalsService } from './mapping-proposals.service.js';
import { MAX_SAMPLE_BYTES, type UploadedFile as SampleUpload } from './sample-file-reader.js';

const idParams = z.object({ proposalId: z.uuid() });
const listQuery = paginationQuerySchema.extend({ status: mappingProposalStatusSchema.optional() });

function signedInMeta(req: Request) {
  const meta = requestMeta(req);
  if (!meta.actor) throw new UnauthenticatedError();
  return { ...meta, actor: meta.actor };
}

@ApiTags('mapping')
@Controller('mapping-proposals')
export class MappingProposalsController {
  constructor(private readonly proposals: MappingProposalsService) {}

  @Post()
  @RequirePermissions(['mappings:propose'])
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Upload a sample export and get an AI mapping proposal (nothing is saved until approval)',
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_SAMPLE_BYTES, files: 1, fields: 10 } }),
  )
  async propose(
    @UploadedFile() file: SampleUpload | undefined,
    @Body({ schema: createProposalFieldsSchema }) fields: CreateProposalFields,
    @Req() req: Request,
  ) {
    return { data: await this.proposals.propose(file, fields, signedInMeta(req)) };
  }

  @Get()
  @RequirePermissions(['mappings:propose'])
  @ApiOperation({ summary: 'List mapping proposals' })
  async list(@Query({ schema: listQuery }) query: z.infer<typeof listQuery>) {
    const { items, total } = await this.proposals.list(query.status, query.page, query.pageSize);
    return { data: items, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  @Get(':proposalId')
  @RequirePermissions(['mappings:propose'])
  @ApiOperation({ summary: 'One mapping proposal with its per-column suggestions' })
  async get(@Param({ schema: idParams }) params: z.infer<typeof idParams>) {
    return { data: await this.proposals.get(params.proposalId) };
  }

  @Post(':proposalId/approve')
  @HttpCode(200)
  @RequirePermissions(['mappings:approve'])
  @ApiOperation({ summary: 'Approve (with edits) and save a new versioned mapping' })
  async approve(
    @Param({ schema: idParams }) params: z.infer<typeof idParams>,
    @Body({ schema: approveProposalSchema }) body: ApproveProposalRequest,
    @Req() req: Request,
  ) {
    return { data: await this.proposals.approve(params.proposalId, body, signedInMeta(req)) };
  }

  @Post(':proposalId/reject')
  @HttpCode(200)
  @RequirePermissions(['mappings:approve'])
  @ApiOperation({ summary: 'Reject a proposal' })
  async reject(
    @Param({ schema: idParams }) params: z.infer<typeof idParams>,
    @Body({ schema: rejectProposalSchema }) body: RejectProposalRequest,
    @Req() req: Request,
  ) {
    return { data: await this.proposals.reject(params.proposalId, body, signedInMeta(req)) };
  }
}
