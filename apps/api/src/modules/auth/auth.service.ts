import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  entityCodeSchema,
  localeSchema,
  roleSchema,
  type LoginRequest,
  type Role,
  type SessionUser,
} from '@huitong/shared';

import {
  InvalidCredentialsError,
  NotFoundError,
  SessionExpiredError,
} from '../../common/errors/app-error.js';
import type { RequestMeta } from '../../common/http/request-meta.js';
import { AuditLogService } from '../../infrastructure/audit/audit-log.service.js';
import { AccessPolicyService } from '../access/access-policy.service.js';
import { UsersRepository } from '../users/users.repository.js';
import { createCsrfToken } from './csrf.js';
import { PasswordHasher } from './password-hasher.js';
import { RefreshTokenReuseError, TokenService } from './token.service.js';

export interface IssuedSession {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

type StoredUser = NonNullable<Awaited<ReturnType<UsersRepository['findById']>>>;

/** Sign-in, demo sign-in, token refresh and sign-out. Every outcome that matters is audited. */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly access: AccessPolicyService,
    private readonly audit: AuditLogService,
  ) {}

  async login(input: LoginRequest, meta: RequestMeta): Promise<IssuedSession> {
    const user = await this.users.findForSignIn(input.email);
    const passwordOk = await this.hasher.verify(user?.passwordHash ?? null, input.password);
    if (!user || !passwordOk || !user.isActive) {
      const reason = !user ? 'unknown_email' : !passwordOk ? 'bad_password' : 'inactive';
      await this.audit.record(
        {
          action: 'auth.login.failed',
          entityType: 'user',
          entityId: user?.id ?? null,
          // Unknown emails are stored only as a hash: enough to spot repeated attempts.
          metadata: {
            reason,
            emailHash: createHash('sha256')
              .update(input.email.toLowerCase())
              .digest('hex')
              .slice(0, 16),
          },
        },
        meta,
      );
      throw new InvalidCredentialsError();
    }
    return this.startSession(user, meta, 'auth.login.succeeded');
  }

  /** Signs in as the seeded demo user of a role. Only reachable when DEMO_MODE is on. */
  async demoLogin(role: Role, meta: RequestMeta): Promise<IssuedSession> {
    const user = await this.users.findDemoUser(role);
    if (!user) {
      throw new NotFoundError(`A demo user for ${role}`);
    }
    return this.startSession(user, meta, 'auth.demo_login');
  }

  async refresh(refreshToken: string | undefined, meta: RequestMeta): Promise<IssuedSession> {
    if (!refreshToken) {
      throw new SessionExpiredError();
    }
    try {
      const rotated = await this.tokens.rotateRefreshToken(refreshToken, meta.userAgent);
      const user = await this.users.findById(rotated.userId);
      if (!user?.isActive) {
        throw new SessionExpiredError();
      }
      return {
        user: this.toSessionUser(user),
        accessToken: await this.tokens.signAccessToken(this.claimsOf(user)),
        refreshToken: rotated.refreshToken,
        csrfToken: createCsrfToken(),
      };
    } catch (error) {
      if (error instanceof RefreshTokenReuseError) {
        await this.audit.record(
          {
            action: 'auth.refresh.reuse_detected',
            entityType: 'user',
            entityId: error.userId,
            metadata: { familyId: error.familyId },
          },
          meta,
        );
      }
      throw error;
    }
  }

  async logout(refreshToken: string | undefined, meta: RequestMeta): Promise<void> {
    const userId = refreshToken ? await this.tokens.revoke(refreshToken) : null;
    if (userId) {
      await this.audit.record(
        { action: 'auth.logout', entityType: 'user', entityId: userId },
        meta,
      );
    }
  }

  async sessionUser(userId: string): Promise<SessionUser> {
    const user = await this.users.findById(userId);
    if (!user?.isActive) {
      throw new SessionExpiredError();
    }
    return this.toSessionUser(user);
  }

  private async startSession(
    user: StoredUser,
    meta: RequestMeta,
    action: string,
  ): Promise<IssuedSession> {
    const now = new Date();
    await this.users.recordSignIn(user.id, now);
    const session: IssuedSession = {
      user: this.toSessionUser(user),
      accessToken: await this.tokens.signAccessToken(this.claimsOf(user)),
      refreshToken: await this.tokens.issueRefreshToken(user.id, meta.userAgent),
      csrfToken: createCsrfToken(),
    };
    await this.audit.record(
      { action, entityType: 'user', entityId: user.id },
      {
        ...meta,
        actor: {
          id: user.id,
          role: session.user.role,
          homeEntityCode: session.user.homeEntityCode,
        },
      },
    );
    return session;
  }

  private claimsOf(user: StoredUser) {
    return {
      id: user.id,
      role: roleSchema.parse(user.role),
      homeEntityCode: entityCodeSchema.parse(user.homeEntityCode),
    };
  }

  private toSessionUser(user: StoredUser): SessionUser {
    const role = roleSchema.parse(user.role);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      displayNameZh: user.displayNameZh,
      role,
      homeEntityCode: entityCodeSchema.parse(user.homeEntityCode),
      employeeNo: user.employeeNo,
      locale: localeSchema.catch('en').parse(user.locale),
      permissions: this.access.permissionsFor(role),
    };
  }
}
