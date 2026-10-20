import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';

/** Stored inbound webhooks. `(source, eventId)` is unique, which makes a redelivery a no-op. */
@Injectable()
export class WebhookEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Stores a verified event; null when the same event was stored before (a redelivery). */
  async store(event: {
    source: string;
    eventId: string;
    eventType: string;
    payload: Prisma.InputJsonValue;
  }) {
    try {
      return await this.prisma.inboundWebhookEvent.create({
        data: { ...event, signatureValid: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        return null;
      throw error;
    }
  }

  async markProcessed(id: string): Promise<void> {
    await this.prisma.inboundWebhookEvent.update({
      where: { id },
      data: { status: 'PROCESSED', processedAt: new Date(), error: null },
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.inboundWebhookEvent.update({
      where: { id },
      data: { status: 'FAILED', error },
    });
  }

  async markRejected(id: string, reason: string): Promise<void> {
    await this.prisma.inboundWebhookEvent.update({
      where: { id },
      data: { status: 'REJECTED', processedAt: new Date(), error: reason },
    });
  }

  /** Events stored but never handled, e.g. after a crash between commit and publish. */
  findUnhandled(receivedBefore: Date, limit: number) {
    return this.prisma.inboundWebhookEvent.findMany({
      where: { status: 'RECEIVED', receivedAt: { lt: receivedBefore } },
      orderBy: { receivedAt: 'asc' },
      take: limit,
    });
  }
}
