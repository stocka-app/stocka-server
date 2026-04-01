import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DiscoveryModule } from '@nestjs/core';
import { SecurityGuard } from '@common/security/security.guard';
import { JwtValidator } from '@common/security/validators/jwt.validator';
import { TenantAccessValidator } from '@common/security/validators/tenant-access.validator';
import { SecurityBootstrapValidator } from '@common/security/security-bootstrap.validator';
import { AuthorizationModule } from '@authorization/infrastructure/authorization.module';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';

@Module({
  imports: [JwtModule.register({}), DiscoveryModule, AuthorizationModule, MediatorModule],
  providers: [SecurityGuard, JwtValidator, TenantAccessValidator, SecurityBootstrapValidator],
  exports: [SecurityGuard, JwtValidator, TenantAccessValidator],
})
export class SecurityModule {}
