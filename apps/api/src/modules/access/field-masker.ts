import { Injectable } from '@nestjs/common';
import {
  decideMasking,
  EMPLOYEE_FIELD_CLASSIFICATION,
  type ClassificationLevel,
  type EntityCode,
  type MaskedValue,
} from '@huitong/shared';

import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import { AccessPolicyService } from './access-policy.service.js';

/**
 * Field-level masking for values that sit deeper than the masking interceptor
 * reaches: each source's value in the record drawer, conflict candidates,
 * history and sync previews. Fields it does not know are treated as
 * RESTRICTED (fail closed).
 */
@Injectable()
export class FieldMasker {
  constructor(private readonly access: AccessPolicyService) {}

  classification(field: string): ClassificationLevel {
    return (
      (EMPLOYEE_FIELD_CLASSIFICATION as Record<string, ClassificationLevel | undefined>)[field] ??
      'RESTRICTED'
    );
  }

  /** Whether the viewer may see this field on records of `entityCode`. */
  canSee(field: string, viewer: AuthenticatedUser, entityCode: EntityCode): boolean {
    return decideMasking(
      this.access.clearanceRules(),
      viewer.role,
      entityCode,
      this.classification(field),
    ).visible;
  }

  /** The value as the viewer may see it: itself, or a MaskedValue saying why it is hidden. */
  value(field: string, value: unknown, viewer: AuthenticatedUser, entityCode: EntityCode): unknown {
    if (value === null || value === undefined) return null;
    const level = this.classification(field);
    const decision = decideMasking(this.access.clearanceRules(), viewer.role, entityCode, level);
    if (decision.visible) return value;
    const masked: MaskedValue = { masked: true, classification: level, reason: decision.reason };
    return masked;
  }
}
