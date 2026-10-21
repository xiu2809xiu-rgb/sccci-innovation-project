import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';

import { readMetadata, ServesMockData } from '../decorators/route-metadata.js';

/** Adds `meta.mock` to a `{ data }` envelope, keeping any pagination meta. */
export function markAsMock(body: unknown): unknown {
  if (body === null || typeof body !== 'object' || !('data' in body)) {
    return body;
  }
  const { meta } = body as { meta?: unknown };
  const existing = meta !== null && typeof meta === 'object' ? meta : {};
  return { ...body, meta: { ...existing, mock: true } };
}

/**
 * Labels responses from routes marked @ServesMockData(), so no sample is ever
 * presented as the real implementation (the honesty rule in
 * docs/agile/hero-journey.md).
 */
@Injectable()
export class MockDataInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!readMetadata(this.reflector, ServesMockData, context)) {
      return next.handle();
    }
    return next.handle().pipe(map(markAsMock));
  }
}
