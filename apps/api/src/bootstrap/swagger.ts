import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { AUTH_COOKIES } from '@huitong/shared';

/** The OpenAPI document for every route, built from the controllers' decorators. */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('HuiTong API')
      .setDescription(
        'Integration and workflow-automation layer for Organisation E (Problem Statement #17). ' +
          'Every response contains synthetic demo data only. Errors use one envelope: ' +
          '{ error: { code, message, details, traceId } }. Responses with meta.mock come from ' +
          "a head-start route's typed sample data, not the real implementation.",
      )
      .setVersion('0.1.0')
      .addCookieAuth(AUTH_COOKIES.access)
      .build(),
  );
}

/** OpenAPI document and Swagger UI at `/api/docs` (JSON at `/api/docs-json`). */
export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('api/docs', app, createOpenApiDocument(app), {
    jsonDocumentUrl: 'api/docs-json',
  });
}
