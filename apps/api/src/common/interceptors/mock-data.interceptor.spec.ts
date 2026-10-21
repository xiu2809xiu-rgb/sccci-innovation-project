import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';

import { markAsMock, MockDataInterceptor } from './mock-data.interceptor.js';

function contextFor(marked: boolean): { context: ExecutionContext; reflector: Reflector } {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(marked ? true : undefined);
  const context = { getHandler: () => undefined, getClass: () => undefined } as never;
  return { context, reflector };
}

function handlerReturning(body: unknown): CallHandler {
  return { handle: () => of(body) };
}

describe('markAsMock', () => {
  it('adds meta.mock to a single-resource envelope', () => {
    expect(markAsMock({ data: { id: 'a' } })).toEqual({ data: { id: 'a' }, meta: { mock: true } });
  });

  it('keeps the pagination meta of a list envelope', () => {
    expect(markAsMock({ data: [], meta: { page: 2, pageSize: 25, total: 30 } })).toEqual({
      data: [],
      meta: { page: 2, pageSize: 25, total: 30, mock: true },
    });
  });

  it('leaves anything that is not an envelope alone', () => {
    expect(markAsMock(undefined)).toBeUndefined();
    expect(markAsMock('ok')).toBe('ok');
    expect(markAsMock({ status: 'up' })).toEqual({ status: 'up' });
  });
});

describe('MockDataInterceptor', () => {
  it('labels the responses of routes marked @ServesMockData()', async () => {
    const { context, reflector } = contextFor(true);
    const result = await firstValueFrom(
      new MockDataInterceptor(reflector).intercept(context, handlerReturning({ data: 1 })),
    );
    expect(result).toEqual({ data: 1, meta: { mock: true } });
  });

  it('passes other routes through untouched', async () => {
    const { context, reflector } = contextFor(false);
    const result = await firstValueFrom(
      new MockDataInterceptor(reflector).intercept(context, handlerReturning({ data: 1 })),
    );
    expect(result).toEqual({ data: 1 });
  });
});
