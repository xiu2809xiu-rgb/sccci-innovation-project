import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

/** Refresh tokens are stored only as SHA-256 hashes. */
@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent: string | null;
  }): Promise<void> {
    await this.prisma.refreshToken.create({ data });
  }

  findByHash(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  /**
   * Marks the token as used, only if it is still active. Returns false when it
   * was already rotated or revoked: a second use means the token leaked.
   */
  async markRotatedIfActive(id: string, at: Date): Promise<boolean> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { id, rotatedAt: null, revokedAt: null },
      data: { rotatedAt: at },
    });
    return result.count === 1;
  }

  async revokeFamily(familyId: string, at: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: at },
    });
  }
}
