import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { entityCodeSchema, roleSchema, type EntityCode, type Role } from '@huitong/shared';
import { z } from 'zod';

import { SessionExpiredError } from '../../common/errors/app-error.js';
import { AppConfig } from '../../config/app-config.js';
import { RefreshTokenRepository } from './refresh-token.repository.js';

const ISSUER = 'huitong-api';
const AUDIENCE = 'huitong-web';

const accessClaimsSchema = z.object({
  sub: z.uuid(),
  role: roleSchema,
  ent: entityCodeSchema,
});

export interface AccessClaims {
  userId: string;
  role: Role;
  homeEntityCode: EntityCode;
}

export interface RotationResult {
  userId: string;
  familyId: string;
  refreshToken: string;
}

/** Thrown when a rotated refresh token is presented again; the caller audits it. */
export class RefreshTokenReuseError extends SessionExpiredError {
  constructor(
    readonly userId: string,
    readonly familyId: string,
  ) {
    super();
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Access and refresh tokens. Access tokens are short-lived HS256 JWTs. Refresh
 * tokens are opaque random values, rotated on every use; presenting a used
 * token again revokes its whole family, which ends a stolen session.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  signAccessToken(user: { id: string; role: Role; homeEntityCode: EntityCode }): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, role: user.role, ent: user.homeEntityCode },
      {
        secret: this.config.auth.accessSecret,
        expiresIn: this.config.auth.accessTtlSeconds,
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithm: 'HS256',
      },
    );
  }

  /** The verified claims, or null for any invalid, expired or tampered token. */
  async verifyAccessToken(token: string): Promise<AccessClaims | null> {
    try {
      const payload: unknown = await this.jwt.verifyAsync(token, {
        secret: this.config.auth.accessSecret,
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ['HS256'],
      });
      const claims = accessClaimsSchema.parse(payload);
      return { userId: claims.sub, role: claims.role, homeEntityCode: claims.ent };
    } catch {
      return null;
    }
  }

  /** Issues a refresh token in a new family, or in `familyId` when rotating. */
  async issueRefreshToken(
    userId: string,
    userAgent: string | null,
    familyId: string = randomUUID(),
  ): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.auth.refreshTtlDays * 86_400_000);
    await this.refreshTokens.create({
      userId,
      familyId,
      tokenHash: sha256(token),
      expiresAt,
      userAgent,
    });
    return token;
  }

  /** Exchanges a refresh token for a new one in the same family. */
  async rotateRefreshToken(token: string, userAgent: string | null): Promise<RotationResult> {
    const record = await this.refreshTokens.findByHash(sha256(token));
    const now = new Date();
    if (!record || record.expiresAt <= now) {
      throw new SessionExpiredError();
    }
    if (!(await this.refreshTokens.markRotatedIfActive(record.id, now))) {
      await this.refreshTokens.revokeFamily(record.familyId, now);
      throw new RefreshTokenReuseError(record.userId, record.familyId);
    }
    const refreshToken = await this.issueRefreshToken(record.userId, userAgent, record.familyId);
    return { userId: record.userId, familyId: record.familyId, refreshToken };
  }

  /** Ends the session the token belongs to (logout). Unknown tokens are ignored. */
  async revoke(token: string): Promise<string | null> {
    const record = await this.refreshTokens.findByHash(sha256(token));
    if (!record) {
      return null;
    }
    await this.refreshTokens.revokeFamily(record.familyId, new Date());
    return record.userId;
  }
}
