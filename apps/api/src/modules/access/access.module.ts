import { Global, Module } from '@nestjs/common';

import { AccessPolicyRepository } from './access-policy.repository.js';
import { AccessPolicyService } from './access-policy.service.js';
import { FieldMasker } from './field-masker.js';

/** The RBAC matrix and clearance rules used by the permissions guard, the masking interceptor and FieldMasker. */
@Global()
@Module({
  providers: [AccessPolicyRepository, AccessPolicyService, FieldMasker],
  exports: [AccessPolicyService, FieldMasker],
})
export class AccessModule {}
