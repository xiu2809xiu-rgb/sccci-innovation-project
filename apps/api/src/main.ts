import 'reflect-metadata';
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap/configure-app.js';
import { setupSwagger } from './bootstrap/swagger.js';
import { AppConfig } from './config/app-config.js';

async function bootstrap(): Promise<void> {
  const config = AppConfig.fromEnv(process.env);
  // rawBody keeps the exact bytes of webhook requests for HMAC verification.
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config), {
    bufferLogs: true,
    rawBody: true,
  });
  app.useLogger(app.get(Logger));
  configureApp(app, config);
  if (config.http.swaggerEnabled) {
    setupSwagger(app);
  }
  await app.listen(config.http.port);
}

await bootstrap();
