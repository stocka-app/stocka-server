import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { TenantMembershipContext } from '@tenant/domain/contracts/tenant-facade.contract';
import { CapabilityResolver } from '@authorization/domain/services/capability.resolver';
import { SystemAction } from '@authorization/domain/enums/actions-catalog';
import { TierEnum } from '@authorization/domain/enums/tier.enum';
import { MemberRoleEnum } from '@authorization/domain/enums/member-role.enum';
import { PolicyContext } from '@authorization/domain/models/policy-context';

@Injectable()
export class RbacValidator {
  private readonly logger = new Logger(RbacValidator.name);

  constructor(private readonly capabilityResolver: CapabilityResolver) {}

  async validate(action: SystemAction, membershipContext: TenantMembershipContext): Promise<void> {
    const policyContext: PolicyContext = {
      tenantTier: membershipContext.tier as TierEnum,
      userRole: membershipContext.role as MemberRoleEnum,
      action,
      usageCounts: membershipContext.usageCounts,
    };

    const result = await this.capabilityResolver.canPerformAction(policyContext);

    if (result.isErr()) {
      this.logger.warn('RBAC access denied', {
        userId: membershipContext.userId,
        tenantId: membershipContext.tenantId,
        action,
        tier: membershipContext.tier,
        role: membershipContext.role,
        reason: result.error.errorCode,
      });

      throw new HttpException(
        { error: result.error.errorCode, message: result.error.message },
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
