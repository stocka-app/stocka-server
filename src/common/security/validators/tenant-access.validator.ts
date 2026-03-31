import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import {
  ITenantFacade,
  TenantMembershipContext,
} from '@tenant/domain/contracts/tenant-facade.contract';
import { JwtPayload } from '@common/decorators/current-user.decorator';

@Injectable()
export class TenantAccessValidator {
  constructor(
    @Inject(INJECTION_TOKENS.TENANT_FACADE)
    private readonly tenantFacade: ITenantFacade,
  ) {}

  async validate(user: JwtPayload): Promise<TenantMembershipContext> {
    if (!user.tenantId) {
      throw new ForbiddenException({ error: 'TENANT_REQUIRED' });
    }

    const membershipContext = await this.tenantFacade.getMembershipContext(user.uuid);

    if (!membershipContext) {
      throw new ForbiddenException({ error: 'MEMBERSHIP_REQUIRED' });
    }

    if (membershipContext.tenantStatus !== 'active') {
      throw new ForbiddenException({ error: 'TENANT_NOT_ACTIVE' });
    }

    return membershipContext;
  }
}
