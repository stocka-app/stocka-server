import { Injectable, Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ITenantFacade,
  CreateTenantFacadeProps,
} from '@tenant/domain/contracts/tenant-facade.contract';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { CreateTenantCommand } from '@tenant/application/commands/create-tenant/create-tenant.command';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { CreateTenantResult } from '@tenant/infrastructure/http/controllers/complete-onboarding/complete-onboarding-out.dto';

@Injectable()
export class TenantFacade implements ITenantFacade {
  constructor(
    @Inject(INJECTION_TOKENS.TENANT_MEMBER_CONTRACT)
    private readonly memberContract: ITenantMemberContract,
    @Inject(INJECTION_TOKENS.TENANT_CONTRACT)
    private readonly tenantContract: ITenantContract,
    private readonly commandBus: CommandBus,
  ) {}

  async getActiveMembership(
    userUUID: string,
  ): Promise<{ tenantUUID: string; role: string } | null> {
    const member = await this.memberContract.findActiveByUserUUID(userUUID);
    if (!member || !member.isActive()) return null;

    const tenant = await this.tenantContract.findById(member.tenantId);
    if (!tenant) return null;

    return { tenantUUID: tenant.uuid, role: member.role.toString() };
  }

  async createTenantForUser(props: CreateTenantFacadeProps): Promise<{ tenantUUID: string }> {
    const command = new CreateTenantCommand(
      props.userUUID,
      props.name,
      props.businessType,
      props.country ?? 'MX',
      props.timezone ?? 'America/Mexico_City',
    );

    const result = await this.commandBus.execute<CreateTenantCommand, CreateTenantResult>(command);

    if (result.isErr()) throw result.error;
    return { tenantUUID: result.value.tenantId };
  }
}
