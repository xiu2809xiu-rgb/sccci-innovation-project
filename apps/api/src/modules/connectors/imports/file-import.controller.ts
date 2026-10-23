import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MAX_IMPORT_BYTES, sampleEncodingSchema } from '@huitong/shared';
import type { Request } from 'express';
import { z } from 'zod';

import { RequirePermissions } from '../../../common/decorators/route-metadata.js';
import { UnauthenticatedError } from '../../../common/errors/app-error.js';
import { requestMeta } from '../../../common/http/request-meta.js';
import type { UploadedFile as ImportUpload } from '../../mapping/proposals/sample-file-reader.js';
import { FileImportService } from './file-import.service.js';

const params = z.object({ connectorId: z.string().regex(/^[a-z0-9-]{2,60}$/) });
const stageFields = z.object({ encoding: sampleEncodingSchema.optional() });

/** A file connector's import: stage a file, see what was staged, or discard it. */
@ApiTags('connectors')
@Controller('connectors/:connectorId/import-file')
export class FileImportController {
  constructor(private readonly imports: FileImportService) {}

  @Post()
  @RequirePermissions(['employees:sync'])
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      "Stage a whole export for a file connector, read through its approved mapping (nothing reaches the master until a sync's preview and apply)",
  })
  @UseInterceptors(
    // Browsers send the file name as UTF-8, so a Chinese name arrives as written.
    FileInterceptor('file', {
      defParamCharset: 'utf8',
      limits: { fileSize: MAX_IMPORT_BYTES, files: 1, fields: 5 },
    }),
  )
  async stage(
    @Param({ schema: params }) { connectorId }: z.infer<typeof params>,
    @UploadedFile() file: ImportUpload | undefined,
    @Body({ schema: stageFields }) fields: z.infer<typeof stageFields>,
    @Req() req: Request,
  ) {
    const meta = requestMeta(req);
    if (!meta.actor) throw new UnauthenticatedError();
    return {
      data: await this.imports.stage(connectorId, file, fields.encoding, {
        ...meta,
        actor: meta.actor,
      }),
    };
  }

  @Get()
  @RequirePermissions(['connectors:read'])
  @ApiOperation({ summary: "The connector's staged file, without its rows; null when none waits" })
  async current(@Param({ schema: params }) { connectorId }: z.infer<typeof params>) {
    return { data: await this.imports.current(connectorId) };
  }

  @Delete()
  @HttpCode(204)
  @RequirePermissions(['employees:sync'])
  @ApiOperation({ summary: 'Discard the staged file' })
  async discard(
    @Param({ schema: params }) { connectorId }: z.infer<typeof params>,
    @Req() req: Request,
  ): Promise<void> {
    await this.imports.discard(connectorId, requestMeta(req));
  }
}
