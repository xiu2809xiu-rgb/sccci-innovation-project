import { Global, Module } from '@nestjs/common';

import { AccessPolicyRepository } from './access-policy.repository.js';
import { AccessPolicyService } from './access-policy.service.js';

/** The RBAC matrix and clearance rules used by the permissions guard and the masking interceptor. */
@Global()
@Module({
  providers: [AccessPolicyRepository, AccessPolicyService],
  exports: [AccessPolicyService],
})
export class AccessModule {}
