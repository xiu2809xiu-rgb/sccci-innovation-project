import type { ErrorRequestHandler } from 'express';
import type { Logger } from 'pino';
import { ZodError } from 'zod';

/** An error in HQ's envelope: `{ 返回码, 消息 }` with an SAP-style code such as `E404`. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Maps every failure to HQ's error envelope; unexpected errors are logged, never leaked. */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, _req, res, _next) => {
    if (error instanceof ZodError) {
      const detail = error.issues
        .map((issue) => `${issue.path.join('.') || 'request'}: ${issue.message}`)
        .join('; ');
      res.status(400).json({ 返回码: 'E400', 消息: `参数错误: ${detail}` });
      return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json({ 返回码: error.code, 消息: error.message });
      return;
    }
    if (error instanceof SyntaxError) {
      res.status(400).json({ 返回码: 'E400', 消息: '参数错误: 请求体不是有效的 JSON' });
      return;
    }
    logger.error({ err: error }, 'unhandled error');
    res.status(500).json({ 返回码: 'E500', 消息: '系统内部错误' });
  };
}
