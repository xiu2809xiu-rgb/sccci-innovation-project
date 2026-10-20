import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AUTH_COOKIES,
  authOptionsSchema,
  dataEnvelopeSchema,
  loginRequestSchema,
  sessionUserSchema,
  type DataEnvelope,
  type LoginRequest,
  type SessionUser,
} from '@huitong/shared';
import type { Request, Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/route-metadata.js';
import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import { requestMeta } from '../../common/http/request-meta.js';
import { AUTH_OPTIONS, type AuthOptions } from './auth-options.js';
import { AuthService } from './auth.service.js';
import { createCsrfToken } from './csrf.js';
import { readCookie, SessionCookies } from './session-cookies.js';

/** Sign-in attempts per client per minute; slows down password guessing. */
const LOGIN_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: SessionCookies,
    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
  ) {}

  @Get('options')
  @Public()
  @ApiOperation({ summary: 'Public sign-in options, e.g. whether demo sign-in is available' })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(authOptionsSchema) })
  getOptions(): DataEnvelope<AuthOptions> {
    return { data: { demoMode: this.options.demoMode } };
  }

  @Get('csrf')
  @Public()
  @ApiOperation({ summary: 'Issue the CSRF cookie the web app echoes in X-CSRF-Token' })
  csrf(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): DataEnvelope<{ csrfToken: string }> {
    const csrfToken = readCookie(req, AUTH_COOKIES.csrf) ?? createCsrfToken();
    this.cookies.setCsrf(res, csrfToken);
    return { data: { csrfToken } };
  }

  @Post('login')
  @Public()
  @HttpCode(200)
  @Throttle(LOGIN_LIMIT)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(sessionUserSchema) })
  async login(
    @Body({ schema: loginRequestSchema }) body: LoginRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DataEnvelope<SessionUser>> {
    const session = await this.auth.login(body, requestMeta(req));
    this.cookies.setSession(res, session);
    return { data: session.user };
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(sessionUserSchema) })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DataEnvelope<SessionUser>> {
    try {
      const session = await this.auth.refresh(
        readCookie(req, AUTH_COOKIES.refresh),
        requestMeta(req),
      );
      this.cookies.setSession(res, session);
      return { data: session.user };
    } catch (error) {
      this.cookies.clear(res);
      throw error;
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(204)
  @ApiOperation({ summary: 'Sign out and revoke the session' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(readCookie(req, AUTH_COOKIES.refresh), requestMeta(req));
    this.cookies.clear(res);
  }

  @Get('me')
  @ApiOperation({ summary: 'The signed-in user and their permissions' })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(sessionUserSchema) })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<DataEnvelope<SessionUser>> {
    return { data: await this.auth.sessionUser(user.id) };
  }
}
