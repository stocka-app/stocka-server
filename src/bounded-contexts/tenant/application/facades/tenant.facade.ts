import { Injectable, Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ITenantFacade,
  CreateTenantFacadeProps,
  TenantMembershipContext,
  TierLimits,
} from '@tenant/domain/contracts/tenant-facade.contract';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { ITenantConfigContract } from '@tenant/domain/contracts/tenant-config.contract';
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
    @Inject(INJECTION_TOKENS.TENANT_CONFIG_CONTRACT)
    private readonly configContract: ITenantConfigContract,
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

  async getMembershipContext(userUUID: string): Promise<TenantMembershipContext | null> {
    const member = await this.memberContract.findActiveByUserUUID(userUUID);
    if (!member || !member.isActive()) return null;

    const tenant = await this.tenantContract.findById(member.tenantId);
    if (!tenant) return null;

    const config = await this.configContract.findByTenantId(member.tenantId);
    if (!config) return null;

    return {
      tenantUUID: tenant.uuid,
      role: member.role.toString(),
      tenantStatus: tenant.status,
      tier: config.tier.toString(),
      usageCounts: {
        storageCount: config.storageCount,
        memberCount: config.memberCount,
        productCount: config.productCount,
      },
    };
  }

  async getTierLimits(userUUID: string): Promise<TierLimits | null> {
    const member = await this.memberContract.findActiveByUserUUID(userUUID);
    if (!member || !member.isActive()) return null;

    const tenant = await this.tenantContract.findById(member.tenantId);
    if (!tenant) return null;

    const config = await this.configContract.findByTenantId(member.tenantId);
    if (!config) return null;

    return {
      tier: config.tier.toString(),
      maxCustomRooms: config.maxCustomRooms,
      maxStoreRooms: config.maxStoreRooms,
      maxWarehouses: config.maxWarehouses,
    };
  }

  async getTierLimitsByTenantUUID(tenantUUID: string): Promise<TierLimits | null> {
    const tenant = await this.tenantContract.findByUUID(tenantUUID);
    if (!tenant?.id) return null;

    const config = await this.configContract.findByTenantId(tenant.id);
    if (!config) return null;

    return {
      tier: config.tier.toString(),
      maxCustomRooms: config.maxCustomRooms,
      maxStoreRooms: config.maxStoreRooms,
      maxWarehouses: config.maxWarehouses,
    };
  }

  /* istanbul ignore next -- CompleteOnboardingController dispatches CreateTenantCommand directly via CommandBus */
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
