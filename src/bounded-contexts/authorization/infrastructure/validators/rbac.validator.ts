import { ForbiddenException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import {
  ITenantFacade,
  TenantMembershipContext,
} from '@tenant/domain/contracts/tenant-facade.contract';
import { CapabilityResolver } from '@authorization/domain/services/capability.resolver';
import { SystemAction } from '@authorization/domain/enums/actions-catalog';
import { TierEnum } from '@authorization/domain/enums/tier.enum';
import { MemberRoleEnum } from '@authorization/domain/enums/member-role.enum';
import { PolicyContext } from '@authorization/domain/models/policy-context';
import { JwtPayload } from '@common/decorators/current-user.decorator';

@Injectable()
export class RbacValidator {
  constructor(
    @Inject(INJECTION_TOKENS.TENANT_FACADE)
    private readonly tenantFacade: ITenantFacade,
    private readonly capabilityResolver: CapabilityResolver,
  ) {}

  async validate(
    user: JwtPayload,
    action: SystemAction,
    membershipContext?: TenantMembershipContext,
  ): Promise<void> {
    const context = membershipContext ?? (await this.tenantFacade.getMembershipContext(user.uuid));

    if (!context) {
      throw new ForbiddenException({ error: 'MEMBERSHIP_REQUIRED' });
    }

    const policyContext: PolicyContext = {
      tenantTier: context.tier as TierEnum,
      userRole: context.role as MemberRoleEnum,
      action,
      usageCounts: context.usageCounts,
    };

    const result = await this.capabilityResolver.canPerformAction(policyContext);

    if (result.isErr()) {
      throw new HttpException(
        { error: result.error.errorCode, message: result.error.message },
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
