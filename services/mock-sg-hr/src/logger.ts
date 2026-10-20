import { pino } from 'pino';

export const logger = pino({ name: 'mock-sg-hr', level: process.env.LOG_LEVEL ?? 'info' });
