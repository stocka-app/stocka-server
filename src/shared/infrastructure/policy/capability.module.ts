import { Module, forwardRef } from '@nestjs/common';
import { CapabilityService } from '@shared/infrastructure/policy/capability.service';
import { CapabilityResolver } from '@shared/domain/policy/capability.resolver';
import { RbacBootValidator } from '@shared/infrastructure/policy/rbac-boot-validator';
import { TenantModule } from '@tenant/tenant.module';

@Module({
  imports: [forwardRef(() => TenantModule)],
  providers: [CapabilityService, CapabilityResolver, RbacBootValidator],
  exports: [CapabilityService, CapabilityResolver],
})
export class CapabilityModule {}
