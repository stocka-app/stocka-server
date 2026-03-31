import { ForbiddenException, Injectable } from '@nestjs/common';
import { TenantMembershipContext } from '@tenant/domain/contracts/tenant-facade.contract';
import { JwtPayload } from '@common/decorators/current-user.decorator';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';

@Injectable()
export class TenantAccessValidator {
  constructor(private readonly mediator: MediatorService) {}

  async validate(user: JwtPayload): Promise<TenantMembershipContext> {
    if (!user.tenantId) {
      throw new ForbiddenException({ error: 'MEMBERSHIP_REQUIRED' });
    }

    const membershipContext = await this.mediator.tenant.getMembershipContext(user.uuid);

    if (!membershipContext) {
      throw new ForbiddenException({ error: 'MEMBERSHIP_REQUIRED' });
    }

    if (membershipContext.tenantStatus !== 'active') {
      throw new ForbiddenException({ error: 'TENANT_NOT_ACTIVE' });
    }

    return membershipContext;
  }
}
