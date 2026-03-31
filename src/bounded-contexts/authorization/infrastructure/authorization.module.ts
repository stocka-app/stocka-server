import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthzRoleEntity } from '@authorization/infrastructure/persistence/entities/authz-role.entity';
import { RoleActionGrantEntity } from '@authorization/infrastructure/persistence/entities/role-action-grant.entity';
import { RoleDelegationRuleEntity } from '@authorization/infrastructure/persistence/entities/role-delegation-rule.entity';
import { UserPermissionGrantEntity } from '@authorization/infrastructure/persistence/entities/user-permission-grant.entity';
import { PermissionGrantLogEntity } from '@authorization/infrastructure/persistence/entities/permission-grant-log.entity';
import { RoleChangeLogEntity } from '@authorization/infrastructure/persistence/entities/role-change-log.entity';
import { TierModulePolicyEntity } from '@authorization/infrastructure/persistence/entities/tier-module-policy.entity';
import { TierActionOverrideEntity } from '@authorization/infrastructure/persistence/entities/tier-action-override.entity';
import { TypeOrmRbacPolicyAdapter } from '@authorization/infrastructure/persistence/repositories/typeorm-rbac-policy.adapter';
import { TypeOrmTierDataProvider } from '@authorization/infrastructure/persistence/repositories/typeorm-tier-data-provider';
import { CapabilityService } from '@authorization/infrastructure/services/capability.service';
import { CapabilityResolver } from '@authorization/domain/services/capability.resolver';
import { RoleHierarchyService } from '@authorization/domain/services/role-hierarchy.service';
import { RbacBootValidator } from '@authorization/infrastructure/services/rbac-boot-validator';
import { RbacValidator } from '@authorization/infrastructure/validators/rbac.validator';
import { GetMyPermissionsController } from '@authorization/infrastructure/http/controllers/get-my-permissions/get-my-permissions.controller';
import { GetRolesController } from '@authorization/infrastructure/http/controllers/get-roles/get-roles.controller';
import { GetAssignableRolesController } from '@authorization/infrastructure/http/controllers/get-assignable-roles/get-assignable-roles.controller';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { TierPlanEntity } from '@tenant/infrastructure/entities/tier-plan.entity';
import { ModuleEntity } from '@authorization/infrastructure/persistence/entities/module.entity';
import { CatalogActionEntity } from '@authorization/infrastructure/persistence/entities/catalog-action.entity';
import { CapabilityCacheEntity } from '@authorization/infrastructure/persistence/entities/capability-cache.entity';
import { TenantModule } from '@tenant/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuthzRoleEntity,
      RoleActionGrantEntity,
      RoleDelegationRuleEntity,
      UserPermissionGrantEntity,
      PermissionGrantLogEntity,
      RoleChangeLogEntity,
      TierModulePolicyEntity,
      TierActionOverrideEntity,
      TierPlanEntity,
      ModuleEntity,
      CatalogActionEntity,
      CapabilityCacheEntity,
    ]),
    forwardRef(() => TenantModule),
  ],
  controllers: [GetMyPermissionsController, GetRolesController, GetAssignableRolesController],
  providers: [
    TypeOrmRbacPolicyAdapter,
    TypeOrmTierDataProvider,
    CapabilityService,
    CapabilityResolver,
    RoleHierarchyService,
    RbacBootValidator,
    RbacValidator,
    { provide: INJECTION_TOKENS.RBAC_POLICY_PORT, useExisting: TypeOrmRbacPolicyAdapter },
    { provide: INJECTION_TOKENS.TIER_DATA_PROVIDER, useClass: TypeOrmTierDataProvider },
  ],
  exports: [
    CapabilityService,
    CapabilityResolver,
    RoleHierarchyService,
    RbacValidator,
    INJECTION_TOKENS.RBAC_POLICY_PORT,
    INJECTION_TOKENS.TIER_DATA_PROVIDER,
  ],
})
export class AuthorizationModule {}
