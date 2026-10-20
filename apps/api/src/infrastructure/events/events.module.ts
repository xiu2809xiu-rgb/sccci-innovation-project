import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { DomainEventBus } from './domain-event-bus.js';
import { RealtimeController } from './realtime.controller.js';
import { RealtimeService } from './realtime.service.js';

/**
 * Domain events between modules (Observer pattern via the event emitter, e.g.
 * `oa.approval.completed`) and the live SSE stream to the web app.
 */
@Global()
@Module({
  imports: [EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' })],
  controllers: [RealtimeController],
  providers: [RealtimeService, DomainEventBus],
  exports: [RealtimeService, DomainEventBus],
})
export class EventsModule {}
