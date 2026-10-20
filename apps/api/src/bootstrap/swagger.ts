import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AUTH_COOKIES } from '@huitong/shared';

/** OpenAPI document and Swagger UI at `/api/docs` (JSON at `/api/docs-json`). */
export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('HuiTong API')
      .setDescription(
        'Integration and workflow-automation layer for Organisation E (Problem Statement #17). ' +
          'Every response contains synthetic demo data only. Errors use one envelope: ' +
          '{ error: { code, message, details, traceId } }.',
      )
      .setVersion('0.1.0')
      .addCookieAuth(AUTH_COOKIES.access)
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/docs-json' });
}
