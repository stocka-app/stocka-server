import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthzRoleEntity } from '@authorization/infrastructure/persistence/entities/authz-role.entity';
import { RoleActionGrantEntity } from '@authorization/infrastructure/persistence/entities/role-action-grant.entity';
import { RoleDelegationRuleEntity } from '@authorization/infrastructure/persistence/entities/role-delegation-rule.entity';
import { UserPermissionGrantEntity } from '@authorization/infrastructure/persistence/entities/user-permission-grant.entity';
import { PermissionGrantLogEntity } from '@authorization/infrastructure/persistence/entities/permission-grant-log.entity';
import { RoleChangeLogEntity } from '@authorization/infrastructure/persistence/entities/role-change-log.entity';
import { TypeOrmRbacPolicyAdapter } from '@authorization/infrastructure/persistence/repositories/typeorm-rbac-policy.adapter';
import { CapabilityService } from '@authorization/infrastructure/services/capability.service';
import { CapabilityResolver } from '@authorization/domain/services/capability.resolver';
import { RbacBootValidator } from '@authorization/infrastructure/services/rbac-boot-validator';
import { GetMyPermissionsController } from '@authorization/infrastructure/http/controllers/get-my-permissions/get-my-permissions.controller';
import { GetRolesController } from '@authorization/infrastructure/http/controllers/get-roles/get-roles.controller';
import { GetAssignableRolesController } from '@authorization/infrastructure/http/controllers/get-assignable-roles/get-assignable-roles.controller';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
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
    ]),
    forwardRef(() => TenantModule),
  ],
  controllers: [GetMyPermissionsController, GetRolesController, GetAssignableRolesController],
  providers: [
    TypeOrmRbacPolicyAdapter,
    CapabilityService,
    CapabilityResolver,
    RbacBootValidator,
    { provide: INJECTION_TOKENS.RBAC_POLICY_PORT, useExisting: TypeOrmRbacPolicyAdapter },
  ],
  exports: [CapabilityService, CapabilityResolver, INJECTION_TOKENS.RBAC_POLICY_PORT],
})
export class AuthorizationModule {}
