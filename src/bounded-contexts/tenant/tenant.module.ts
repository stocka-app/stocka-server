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
import { TenantInvitationEntity } from '@tenant/infrastructure/entities/tenant-invitation.entity';
import { AuthzRoleEntity } from '@tenant/infrastructure/entities/authz-role.entity';
import { RoleActionGrantEntity } from '@tenant/infrastructure/entities/role-action-grant.entity';
import { RoleDelegationRuleEntity } from '@tenant/infrastructure/entities/role-delegation-rule.entity';
import { UserPermissionGrantEntity } from '@tenant/infrastructure/entities/user-permission-grant.entity';
import { RoleChangeLogEntity } from '@tenant/infrastructure/entities/role-change-log.entity';
import { PermissionGrantLogEntity } from '@tenant/infrastructure/entities/permission-grant-log.entity';
import { TypeOrmTenantRepository } from '@tenant/infrastructure/repositories/typeorm-tenant.repository';
import { TypeOrmTenantMemberRepository } from '@tenant/infrastructure/repositories/typeorm-tenant-member.repository';
import { TypeOrmTenantProfileRepository } from '@tenant/infrastructure/repositories/typeorm-tenant-profile.repository';
import { TypeOrmTenantConfigRepository } from '@tenant/infrastructure/repositories/typeorm-tenant-config.repository';
import { TypeOrmTierPlanRepository } from '@tenant/infrastructure/repositories/typeorm-tier-plan.repository';
import { TypeOrmTierDataProvider } from '@tenant/infrastructure/repositories/typeorm-tier-data-provider';
import { TypeOrmTenantInvitationRepository } from '@tenant/infrastructure/repositories/typeorm-tenant-invitation.repository';
import { TypeOrmRbacPolicyAdapter } from '@tenant/infrastructure/repositories/typeorm-rbac-policy.adapter';
import { RoleHierarchyService } from '@tenant/domain/services/role-hierarchy.service';
import { CreateTenantHandler } from '@tenant/application/commands/create-tenant/create-tenant.handler';
import { InviteMemberHandler } from '@tenant/application/commands/invite-member/invite-member.handler';
import { AcceptInvitationHandler } from '@tenant/application/commands/accept-invitation/accept-invitation.handler';
import { CancelInvitationHandler } from '@tenant/application/commands/cancel-invitation/cancel-invitation.handler';
import { GetMyTenantHandler } from '@tenant/application/queries/get-my-tenant/get-my-tenant.handler';
import { GetTenantMembersHandler } from '@tenant/application/queries/get-tenant-members/get-tenant-members.handler';
import { GetInvitationsHandler } from '@tenant/application/queries/get-invitations/get-invitations.handler';
import { GetInvitationByTokenHandler } from '@tenant/application/queries/get-invitation-by-token/get-invitation-by-token.handler';
import { TenantFacade } from '@tenant/application/facades/tenant.facade';
import { CompleteOnboardingController } from '@tenant/infrastructure/http/controllers/complete-onboarding/complete-onboarding.controller';
import { GetMyTenantController } from '@tenant/infrastructure/http/controllers/get-my-tenant/get-my-tenant.controller';
import { InviteMemberController } from '@tenant/infrastructure/http/controllers/invite-member/invite-member.controller';
import { GetInvitationsController } from '@tenant/infrastructure/http/controllers/get-invitations/get-invitations.controller';
import { CancelInvitationController } from '@tenant/infrastructure/http/controllers/cancel-invitation/cancel-invitation.controller';
import { AcceptInvitationController } from '@tenant/infrastructure/http/controllers/accept-invitation/accept-invitation.controller';
import { GetInvitationByTokenController } from '@tenant/infrastructure/http/controllers/get-invitation-by-token/get-invitation-by-token.controller';
import { RbacController } from '@tenant/infrastructure/http/controllers/rbac/rbac.controller';
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
      TenantInvitationEntity,
      AuthzRoleEntity,
      RoleActionGrantEntity,
      RoleDelegationRuleEntity,
      UserPermissionGrantEntity,
      RoleChangeLogEntity,
      PermissionGrantLogEntity,
    ]),
    CqrsModule,
    MediatorModule,
    forwardRef(() => CapabilityModule),
  ],
  controllers: [
    CompleteOnboardingController,
    GetMyTenantController,
    InviteMemberController,
    GetInvitationsController,
    CancelInvitationController,
    AcceptInvitationController,
    GetInvitationByTokenController,
    RbacController,
  ],
  providers: [
    { provide: INJECTION_TOKENS.TENANT_CONTRACT, useClass: TypeOrmTenantRepository },
    { provide: INJECTION_TOKENS.TENANT_MEMBER_CONTRACT, useClass: TypeOrmTenantMemberRepository },
    { provide: INJECTION_TOKENS.TENANT_PROFILE_CONTRACT, useClass: TypeOrmTenantProfileRepository },
    { provide: INJECTION_TOKENS.TENANT_CONFIG_CONTRACT, useClass: TypeOrmTenantConfigRepository },
    { provide: INJECTION_TOKENS.TIER_PLAN_CONTRACT, useClass: TypeOrmTierPlanRepository },
    { provide: INJECTION_TOKENS.TIER_DATA_PROVIDER, useClass: TypeOrmTierDataProvider },
    {
      provide: INJECTION_TOKENS.TENANT_INVITATION_CONTRACT,
      useClass: TypeOrmTenantInvitationRepository,
    },
    TypeOrmTenantRepository,
    TypeOrmTenantMemberRepository,
    TypeOrmTenantProfileRepository,
    TypeOrmTenantConfigRepository,
    TypeOrmTierPlanRepository,
    TypeOrmTierDataProvider,
    TypeOrmTenantInvitationRepository,
    TypeOrmRbacPolicyAdapter,
    { provide: INJECTION_TOKENS.RBAC_POLICY_PORT, useExisting: TypeOrmRbacPolicyAdapter },
    RoleHierarchyService,
    TenantFacade,
    { provide: INJECTION_TOKENS.TENANT_FACADE, useExisting: TenantFacade },
    CreateTenantHandler,
    InviteMemberHandler,
    AcceptInvitationHandler,
    CancelInvitationHandler,
    GetMyTenantHandler,
    GetTenantMembersHandler,
    GetInvitationsHandler,
    GetInvitationByTokenHandler,
  ],
  exports: [
    INJECTION_TOKENS.TENANT_FACADE,
    TenantFacade,
    INJECTION_TOKENS.TENANT_MEMBER_CONTRACT,
    INJECTION_TOKENS.TENANT_CONTRACT,
    INJECTION_TOKENS.TENANT_CONFIG_CONTRACT,
    INJECTION_TOKENS.TIER_PLAN_CONTRACT,
    INJECTION_TOKENS.TIER_DATA_PROVIDER,
    INJECTION_TOKENS.TENANT_INVITATION_CONTRACT,
    INJECTION_TOKENS.RBAC_POLICY_PORT,
  ],
})
export class TenantModule {}
