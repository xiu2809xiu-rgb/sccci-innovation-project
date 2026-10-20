import { Controller, Sse, type MessageEvent } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { interval, map, merge, type Observable } from 'rxjs';

import { RealtimeService } from './realtime.service.js';

/** Proxies close idle connections; a comment-like heartbeat keeps the stream open. */
const HEARTBEAT_MS = 25_000;

@ApiTags('events')
@Controller('events')
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  /**
   * Every event goes out as an unnamed `message` whose JSON carries its `type`,
   * so one `onmessage` handler receives them all; only the heartbeat is named.
   */
  @Sse()
  @ApiOperation({ summary: 'Live event stream (Server-Sent Events) for signed-in users' })
  stream(): Observable<MessageEvent> {
    const events$ = this.realtime
      .stream()
      .pipe(map((event): MessageEvent => ({ id: event.id, data: event })));
    const heartbeat$ = interval(HEARTBEAT_MS).pipe(
      map((): MessageEvent => ({ type: 'heartbeat', data: {} })),
    );
    return merge(events$, heartbeat$);
  }
}
