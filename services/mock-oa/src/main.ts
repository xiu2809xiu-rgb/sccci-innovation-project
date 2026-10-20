import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { logger } from './logger.js';

const config = loadConfig();

createApp({ config }).listen(config.port, () => {
  logger.info({ port: config.port, webhookUrl: config.webhookUrl ?? null }, 'mock OA listening');
});
