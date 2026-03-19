import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { TenantMembershipContext } from '@tenant/domain/contracts/tenant-facade.contract';

type RequestWithContext = Request & { membershipContext?: TenantMembershipContext };

export interface CurrentMemberData {
  role: string;
  tenantUUID: string;
}

export const CurrentMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentMemberData => {
    const request = ctx.switchToHttp().getRequest<RequestWithContext>();
    const membershipContext = request.membershipContext;

    if (!membershipContext) {
      throw new Error(
        'Membership context not found in request. Ensure TenantGuard is applied.',
      );
    }

    return {
      role: membershipContext.role,
      tenantUUID: membershipContext.tenantUUID,
    };
  },
);
