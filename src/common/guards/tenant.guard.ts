import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '@common/decorators/current-user.decorator';
import {
  ITenantFacade,
  TenantMembershipContext,
} from '@tenant/domain/contracts/tenant-facade.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

type RequestWithContext = Request & { membershipContext?: TenantMembershipContext };

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @Inject(INJECTION_TOKENS.TENANT_FACADE)
    private readonly tenantFacade: ITenantFacade,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const user = request.user as JwtPayload | undefined;

    if (!user || !user.tenantId) {
      throw new HttpException({ error: 'TENANT_ID_MISSING' }, HttpStatus.UNAUTHORIZED);
    }

    const membershipContext = await this.tenantFacade.getMembershipContext(user.uuid);

    if (!membershipContext) {
      throw new HttpException({ error: 'MEMBERSHIP_NOT_FOUND' }, HttpStatus.FORBIDDEN);
    }

    request.membershipContext = membershipContext;
    return true;
  }
}
