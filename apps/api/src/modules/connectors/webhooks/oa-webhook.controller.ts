import { Controller, HttpCode, Post, Req, type RawBodyRequest } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { Public, SkipCsrf } from '../../../common/decorators/route-metadata.js';
import { requestMeta } from '../../../common/http/request-meta.js';
import { OaWebhookService } from './oa-webhook.service.js';

/** Machine-to-machine: no session and no CSRF token, the HMAC signature is the authentication. */
@ApiTags('webhooks')
@Controller('webhooks')
export class OaWebhookController {
  constructor(private readonly webhooks: OaWebhookService) {}

  @Post('oa')
  @Public()
  @SkipCsrf()
  @HttpCode(202)
  @ApiOperation({ summary: 'Receive an HMAC-signed approval.completed event from the OA platform' })
  async receive(@Req() req: RawBodyRequest<Request>) {
    const data = await this.webhooks.receive(
      {
        rawBody: req.rawBody,
        eventId: req.header('x-oa-event-id'),
        timestamp: req.header('x-oa-timestamp'),
        signature: req.header('x-oa-signature'),
      },
      requestMeta(req),
    );
    return { data };
  }
}
