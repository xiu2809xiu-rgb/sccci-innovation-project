import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  dataEnvelopeSchema,
  demoLoginRequestSchema,
  sessionUserSchema,
  type DataEnvelope,
  type DemoLoginRequest,
  type SessionUser,
} from '@huitong/shared';
import type { Request, Response } from 'express';

import { Public } from '../../common/decorators/route-metadata.js';
import { requestMeta } from '../../common/http/request-meta.js';
import { AuthService } from './auth.service.js';
import { SessionCookies } from './session-cookies.js';

/**
 * Demo sign-in as the seeded user of a role (powers the role switcher). This
 * controller is only registered when DEMO_MODE is on, so production has no
 * such route at all.
 */
@ApiTags('auth')
@Controller('auth')
export class DemoAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: SessionCookies,
  ) {}

  @Post('demo-login')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Demo only: sign in as the seeded user of a role' })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(sessionUserSchema) })
  async demoLogin(
    @Body({ schema: demoLoginRequestSchema }) body: DemoLoginRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DataEnvelope<SessionUser>> {
    const session = await this.auth.demoLogin(body.role, requestMeta(req));
    this.cookies.setSession(res, session);
    return { data: session.user };
  }
}
