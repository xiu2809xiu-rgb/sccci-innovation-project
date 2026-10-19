import { createApp } from './app.js';
import { logger } from './logger.js';

const port = Number(process.env.PORT ?? 4101);

createApp().listen(port, () => {
  logger.info({ port }, 'listening');
});
