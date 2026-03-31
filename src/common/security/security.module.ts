import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DiscoveryModule } from '@nestjs/core';
import { SecurityGuard } from '@common/security/security.guard';
import { JwtValidator } from '@common/security/validators/jwt.validator';
import { TenantAccessValidator } from '@common/security/validators/tenant-access.validator';
import { RbacValidator } from '@common/security/validators/rbac.validator';
import { SecurityBootstrapValidator } from '@common/security/security-bootstrap.validator';
import { CapabilityModule } from '@shared/infrastructure/policy/capability.module';

@Module({
  imports: [JwtModule.register({}), DiscoveryModule, CapabilityModule],
  providers: [
    SecurityGuard,
    JwtValidator,
    TenantAccessValidator,
    RbacValidator,
    SecurityBootstrapValidator,
  ],
  exports: [SecurityGuard],
})
export class SecurityModule {}
