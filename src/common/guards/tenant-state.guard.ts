import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { TenantMembershipContext } from '@tenant/domain/contracts/tenant-facade.contract';

type RequestWithContext = Request & { membershipContext?: TenantMembershipContext };

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class TenantStateGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const membershipContext = request.membershipContext;

    if (!membershipContext) {
      throw new HttpException({ error: 'TENANT_CONTEXT_MISSING' }, HttpStatus.FORBIDDEN);
    }

    const { tenantStatus } = membershipContext;

    if (tenantStatus === 'cancelled') {
      throw new HttpException({ error: 'TENANT_CANCELLED' }, HttpStatus.UNAUTHORIZED);
    }

    if (tenantStatus === 'suspended' && WRITE_METHODS.has(request.method)) {
      throw new HttpException({ error: 'TENANT_SUSPENDED' }, HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
