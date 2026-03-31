import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRE_ACTION_KEY } from '@common/decorators/require-action.decorator';
import { JwtPayload } from '@common/decorators/current-user.decorator';
import {
  ITenantFacade,
  TenantMembershipContext,
} from '@tenant/domain/contracts/tenant-facade.contract';
import { CapabilityResolver } from '@authorization/domain/services/capability.resolver';
import { SystemAction } from '@authorization/domain/enums/actions-catalog';
import { TierEnum } from '@authorization/domain/enums/tier.enum';
import { MemberRoleEnum } from '@authorization/domain/enums/member-role.enum';
import { PolicyContext } from '@authorization/domain/models/policy-context';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(INJECTION_TOKENS.TENANT_FACADE)
    private readonly tenantFacade: ITenantFacade,
    private readonly capabilityResolver: CapabilityResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<SystemAction | undefined>(REQUIRE_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!action) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { membershipContext?: TenantMembershipContext }>();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new HttpException({ error: 'NOT_AUTHENTICATED' }, HttpStatus.UNAUTHORIZED);
    }

    const membershipContext =
      request.membershipContext ?? (await this.tenantFacade.getMembershipContext(user.uuid));

    if (!membershipContext) {
      throw new HttpException({ error: 'MEMBERSHIP_REQUIRED' }, HttpStatus.FORBIDDEN);
    }

    if (membershipContext.tenantStatus !== 'active') {
      throw new HttpException({ error: 'TENANT_NOT_ACTIVE' }, HttpStatus.FORBIDDEN);
    }

    const policyContext: PolicyContext = {
      tenantTier: membershipContext.tier as TierEnum,
      userRole: membershipContext.role as MemberRoleEnum,
      action,
      usageCounts: membershipContext.usageCounts,
    };

    const result = await this.capabilityResolver.canPerformAction(policyContext);

    if (result.isErr()) {
      throw new HttpException(
        { error: result.error.errorCode, message: result.error.message },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
