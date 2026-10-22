import { Injectable } from '@nestjs/common';
import {
  decideMasking,
  EMPLOYEE_FIELD_CLASSIFICATION,
  EMPLOYEE_FIELDS,
  type ClassificationLevel,
  type EmployeeField,
  type EntityCode,
  type MaskedValue,
} from '@huitong/shared';

import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import { AccessPolicyService } from './access-policy.service.js';
import { isShared, type TransferVersion } from './destination-policy.js';

/** An entity whose records the viewer may list, and the fields of them it may not see. */
export interface VisibleScope {
  entityCode: EntityCode;
  hiddenFields: EmployeeField[];
}

/** Fields withheld from a viewer of another entity because no ACTIVE transfer covers them. */
export interface Withholding {
  source: EntityCode;
  destination: EntityCode;
  fields: EmployeeField[];
  transfers: readonly TransferVersion[];
}

/**
 * Field-level masking for values that sit deeper than the masking interceptor
 * reaches: each source's value in the record drawer, conflict candidates,
 * history and sync previews. A value is shown only when the viewer's role is
 * cleared for its classification and, for another entity's records, the
 * cross-border transfer register shares the field with the viewer's own
 * entity (story B-7). Fields it does not know are treated as RESTRICTED
 * (fail closed).
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
    return (
      this.shared(field, viewer, entityCode) &&
      decideMasking(
        this.access.clearanceRules(),
        viewer.role,
        entityCode,
        this.classification(field),
      ).visible
    );
  }

  /**
   * The value as the viewer may see it: itself, or a MaskedValue saying why it is hidden. An empty
   * value is masked too, since showing it empty would tell the viewer something, for example that
   * there is no termination date.
   */
  value(field: string, value: unknown, viewer: AuthenticatedUser, entityCode: EntityCode): unknown {
    const level = this.classification(field);
    if (!this.shared(field, viewer, entityCode)) {
      const withheld: MaskedValue = {
        masked: true,
        classification: level,
        reason: 'CROSS_BORDER_NOT_APPROVED',
      };
      return withheld;
    }
    const decision = decideMasking(this.access.clearanceRules(), viewer.role, entityCode, level);
    if (decision.visible) return value ?? null;
    const masked: MaskedValue = { masked: true, classification: level, reason: decision.reason };
    return masked;
  }

  /**
   * Which of `fields` the register withholds from the viewer on records of
   * `entityCode`, with the transfer versions that decided it; null for the
   * viewer's own entity. The record drawer audits it, and an export (area 3)
   * leaves out every field it names.
   */
  withheld(
    fields: readonly EmployeeField[],
    viewer: AuthenticatedUser,
    entityCode: EntityCode,
  ): Withholding | null {
    const disclosure = this.access.disclosure(entityCode, viewer.homeEntityCode);
    if (disclosure.kind === 'home') return null;
    return {
      source: entityCode,
      destination: viewer.homeEntityCode,
      fields: fields.filter((field) => !isShared(disclosure, field)),
      transfers: disclosure.transfers,
    };
  }

  /** The entities whose records may appear to the viewer at all: in lists, drawers and queues. */
  listable(viewer: AuthenticatedUser): EntityCode[] {
    return this.access.listableEntities(viewer.homeEntityCode);
  }

  canList(viewer: AuthenticatedUser, entityCode: EntityCode): boolean {
    return this.listable(viewer).includes(entityCode);
  }

  /**
   * Each entity the viewer may list, with the fields of its records the viewer may not see: what a
   * query across fields, such as the conflict queue, must leave out, so that not even the existence
   * of a disagreement about a hidden field reaches the viewer.
   */
  visibleScopes(viewer: AuthenticatedUser): VisibleScope[] {
    return this.listable(viewer).map((entityCode) => ({
      entityCode,
      hiddenFields: EMPLOYEE_FIELDS.filter((field) => !this.canSee(field, viewer, entityCode)),
    }));
  }

  private shared(field: string, viewer: AuthenticatedUser, entityCode: EntityCode): boolean {
    return isShared(this.access.disclosure(entityCode, viewer.homeEntityCode), field);
  }
}
