import { Module, forwardRef } from '@nestjs/common';
import { CapabilityService } from '@shared/infrastructure/policy/capability.service';
import { CapabilityResolver } from '@shared/domain/policy/capability.resolver';
import { TenantModule } from '@tenant/tenant.module';

@Module({
  imports: [forwardRef(() => TenantModule)],
  providers: [CapabilityService, CapabilityResolver],
  exports: [CapabilityService, CapabilityResolver],
})
export class CapabilityModule {}
