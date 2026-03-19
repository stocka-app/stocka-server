import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { TenantEntity } from '@tenant/infrastructure/entities/tenant.entity';
import { TenantMemberEntity } from '@tenant/infrastructure/entities/tenant-member.entity';
import { TenantProfileEntity } from '@tenant/infrastructure/entities/tenant-profile.entity';
import { TenantConfigEntity } from '@tenant/infrastructure/entities/tenant-config.entity';
import { TierPlanEntity } from '@tenant/infrastructure/entities/tier-plan.entity';
import { ModuleEntity } from '@tenant/infrastructure/entities/module.entity';
import { CatalogActionEntity } from '@tenant/infrastructure/entities/catalog-action.entity';
import { TierModulePolicyEntity } from '@tenant/infrastructure/entities/tier-module-policy.entity';
import { TierActionOverrideEntity } from '@tenant/infrastructure/entities/tier-action-override.entity';
import { TypeOrmTenantRepository } from '@tenant/infrastructure/repositories/typeorm-tenant.repository';
import { TypeOrmTenantMemberRepository } from '@tenant/infrastructure/repositories/typeorm-tenant-member.repository';
import { TypeOrmTenantProfileRepository } from '@tenant/infrastructure/repositories/typeorm-tenant-profile.repository';
import { TypeOrmTenantConfigRepository } from '@tenant/infrastructure/repositories/typeorm-tenant-config.repository';
import { TypeOrmTierPlanRepository } from '@tenant/infrastructure/repositories/typeorm-tier-plan.repository';
import { TypeOrmTierDataProvider } from '@tenant/infrastructure/repositories/typeorm-tier-data-provider';
import { CreateTenantHandler } from '@tenant/application/commands/create-tenant/create-tenant.handler';
import { GetMyTenantHandler } from '@tenant/application/queries/get-my-tenant/get-my-tenant.handler';
import { GetTenantMembersHandler } from '@tenant/application/queries/get-tenant-members/get-tenant-members.handler';
import { TenantFacade } from '@tenant/application/facades/tenant.facade';
import { CompleteOnboardingController } from '@tenant/infrastructure/http/controllers/complete-onboarding/complete-onboarding.controller';
import { GetMyTenantController } from '@tenant/infrastructure/http/controllers/get-my-tenant/get-my-tenant.controller';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { CapabilityModule } from '@shared/infrastructure/policy/capability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantEntity,
      TenantMemberEntity,
      TenantProfileEntity,
      TenantConfigEntity,
      TierPlanEntity,
      ModuleEntity,
      CatalogActionEntity,
      TierModulePolicyEntity,
      TierActionOverrideEntity,
    ]),
    CqrsModule,
    MediatorModule,
    forwardRef(() => CapabilityModule),
  ],
  controllers: [CompleteOnboardingController, GetMyTenantController],
  providers: [
    { provide: INJECTION_TOKENS.TENANT_CONTRACT, useClass: TypeOrmTenantRepository },
    { provide: INJECTION_TOKENS.TENANT_MEMBER_CONTRACT, useClass: TypeOrmTenantMemberRepository },
    { provide: INJECTION_TOKENS.TENANT_PROFILE_CONTRACT, useClass: TypeOrmTenantProfileRepository },
    { provide: INJECTION_TOKENS.TENANT_CONFIG_CONTRACT, useClass: TypeOrmTenantConfigRepository },
    { provide: INJECTION_TOKENS.TIER_PLAN_CONTRACT, useClass: TypeOrmTierPlanRepository },
    { provide: INJECTION_TOKENS.TIER_DATA_PROVIDER, useClass: TypeOrmTierDataProvider },
    TypeOrmTenantRepository,
    TypeOrmTenantMemberRepository,
    TypeOrmTenantProfileRepository,
    TypeOrmTenantConfigRepository,
    TypeOrmTierPlanRepository,
    TypeOrmTierDataProvider,
    TenantFacade,
    { provide: INJECTION_TOKENS.TENANT_FACADE, useExisting: TenantFacade },
    CreateTenantHandler,
    GetMyTenantHandler,
    GetTenantMembersHandler,
  ],
  exports: [
    INJECTION_TOKENS.TENANT_FACADE,
    TenantFacade,
    INJECTION_TOKENS.TENANT_MEMBER_CONTRACT,
    INJECTION_TOKENS.TENANT_CONTRACT,
    INJECTION_TOKENS.TENANT_CONFIG_CONTRACT,
    INJECTION_TOKENS.TIER_PLAN_CONTRACT,
    INJECTION_TOKENS.TIER_DATA_PROVIDER,
  ],
})
export class TenantModule {}
