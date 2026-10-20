import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { entityCodeSchema, maskRecord, type MaskedValue } from '@huitong/shared';
import type { Request } from 'express';
import { map, type Observable } from 'rxjs';

import { AccessPolicyService } from '../../modules/access/access-policy.service.js';
import { MaskFields, readMetadata, type MaskFieldsSpec } from '../decorators/route-metadata.js';
import type { AuthenticatedUser } from '../http/authenticated-user.js';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Field-level masking for routes marked @MaskFields(). Each returned record is
 * masked for the caller's role and the record's entity; when the entity or the
 * caller is unknown, every classified field is masked (fail closed).
 */
@Injectable()
export class FieldMaskingInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessPolicyService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const spec = readMetadata(this.reflector, MaskFields, context);
    if (!spec) {
      return next.handle();
    }
    const { user } = context.switchToHttp().getRequest<Request>();
    return next.handle().pipe(map((body: unknown) => this.maskBody(body, spec, user)));
  }

  private maskBody(
    body: unknown,
    spec: MaskFieldsSpec,
    user: AuthenticatedUser | undefined,
  ): unknown {
    if (!isRecord(body) || !('data' in body)) {
      return body;
    }
    const data = body.data;
    const masked = Array.isArray(data)
      ? data.map((item: unknown) => (isRecord(item) ? this.maskOne(item, spec, user) : item))
      : isRecord(data)
        ? this.maskOne(data, spec, user)
        : data;
    return { ...body, data: masked };
  }

  private maskOne(
    record: JsonRecord,
    spec: MaskFieldsSpec,
    user: AuthenticatedUser | undefined,
  ): JsonRecord {
    const entity = entityCodeSchema.safeParse(record[spec.entityField]);
    if (!user || !entity.success) {
      return this.maskAll(record, spec);
    }
    return maskRecord(record, spec.classifications, {
      rules: this.access.clearanceRules(),
      role: user.role,
      entityCode: entity.data,
    });
  }

  private maskAll(record: JsonRecord, spec: MaskFieldsSpec): JsonRecord {
    const result: JsonRecord = { ...record };
    for (const [field, level] of Object.entries(spec.classifications)) {
      if (result[field] !== null && result[field] !== undefined && level !== 'PUBLIC') {
        const masked: MaskedValue = {
          masked: true,
          classification: level,
          reason: 'ROLE_CLEARANCE',
        };
        result[field] = masked;
      }
    }
    return result;
  }
}
