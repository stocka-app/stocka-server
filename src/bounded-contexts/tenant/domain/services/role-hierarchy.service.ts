import { Inject, Injectable } from '@nestjs/common';
import { IRbacPolicyPort } from '@shared/domain/policy/rbac-policy.port';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class RoleHierarchyService {
  constructor(
    @Inject(INJECTION_TOKENS.RBAC_POLICY_PORT)
    private readonly rbacPort: IRbacPolicyPort,
  ) {}

  async canAssignRole(inviterRole: string, targetRole: string): Promise<boolean> {
    const assignable = await this.rbacPort.getAssignableRoles(inviterRole);
    return assignable.includes(targetRole);
  }
}
