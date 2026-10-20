import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { RealtimeEvent } from '@huitong/shared';
import { Subject, type Observable } from 'rxjs';

/**
 * Fan-out of live events (sync progress, new conflicts, notifications) to the
 * Server-Sent Events stream. In-process: a multi-replica deployment would put
 * Redis pub/sub behind `publish` (ADR 0008).
 */
@Injectable()
export class RealtimeService {
  private readonly events$ = new Subject<RealtimeEvent>();

  publish(type: string, data: unknown): void {
    this.events$.next({ id: randomUUID(), type, occurredAt: new Date().toISOString(), data });
  }

  stream(): Observable<RealtimeEvent> {
    return this.events$.asObservable();
  }
}
