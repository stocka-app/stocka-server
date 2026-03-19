import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { TenantMembershipContext } from '@tenant/domain/contracts/tenant-facade.contract';

type RequestWithContext = Request & { membershipContext?: TenantMembershipContext };

export interface CurrentTenantData {
  tenantUUID: string;
  status: string;
  tier: string;
}

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentTenantData => {
    const request = ctx.switchToHttp().getRequest<RequestWithContext>();
    const membershipContext = request.membershipContext;

    if (!membershipContext) {
      throw new Error('Membership context not found in request. Ensure TenantGuard is applied.');
    }

    return {
      tenantUUID: membershipContext.tenantUUID,
      status: membershipContext.tenantStatus,
      tier: membershipContext.tier,
    };
  },
);
