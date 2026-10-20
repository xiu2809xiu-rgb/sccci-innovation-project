import { pino } from 'pino';

export const logger = pino({ name: 'mock-cn-hq', level: process.env.LOG_LEVEL ?? 'info' });
