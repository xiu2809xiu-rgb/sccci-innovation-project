import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { DomainEventName, DomainEventPayloads } from '@huitong/shared';

/**
 * Typed domain events between modules (Observer, ADR 0008). Publishers call it
 * after their transaction commits; subscribers use `@OnEvent(name)` and stay
 * thin, validating the payload and enqueueing durable work.
 */
@Injectable()
export class DomainEventBus {
  constructor(private readonly emitter: EventEmitter2) {}

  /** Delivers the event and waits for every subscriber. Resolves with how many there were. */
  async publish<N extends DomainEventName>(
    name: N,
    payload: DomainEventPayloads[N],
  ): Promise<number> {
    const subscribers = this.emitter.listenerCount(name);
    if (subscribers === 0) return 0;
    await this.emitter.emitAsync(name, payload);
    return subscribers;
  }

  /** Whether anything listens for the event yet (area 2 subscribes to OA approvals). */
  hasSubscribers(name: DomainEventName): boolean {
    return this.emitter.listenerCount(name) > 0;
  }
}
