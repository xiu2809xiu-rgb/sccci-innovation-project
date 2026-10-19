import { createApp } from './app.js';
import { logger } from './logger.js';

const port = Number(process.env.PORT ?? 4102);

createApp().listen(port, () => {
  logger.info({ port }, 'listening');
});
