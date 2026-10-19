import { pino } from 'pino';

export const logger = pino({ name: 'mock-oa', level: process.env.LOG_LEVEL ?? 'info' });
