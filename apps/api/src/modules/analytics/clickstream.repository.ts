import { Injectable } from '@nestjs/common';
import type { ClickstreamEvent, Role } from '@huitong/shared';

import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

/** Raw first-party clickstream events. Area 4 builds the aggregations on top. */
@Injectable()
export class ClickstreamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveBatch(events: readonly ClickstreamEvent[], role: Role | null): Promise<void> {
    await this.prisma.clickstreamEvent.createMany({
      data: events.map((event) => ({
        sessionId: event.sessionId,
        type: event.type,
        name: event.name,
        route: event.route,
        role,
        locale: event.locale ?? null,
        theme: event.theme ?? null,
        viewport: event.viewport ?? null,
        ...(event.properties ? { properties: event.properties } : {}),
        occurredAt: new Date(event.occurredAt),
      })),
    });
  }
}
