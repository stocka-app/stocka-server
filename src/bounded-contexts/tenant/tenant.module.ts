import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { TenantEntity } from '@tenant/infrastructure/entities/tenant.entity';
import { TenantMemberEntity } from '@tenant/infrastructure/entities/tenant-member.entity';
import { TenantProfileEntity } from '@tenant/infrastructure/entities/tenant-profile.entity';
import { TenantConfigEntity } from '@tenant/infrastructure/entities/tenant-config.entity';
import { TypeOrmTenantRepository } from '@tenant/infrastructure/repositories/typeorm-tenant.repository';
import { TypeOrmTenantMemberRepository } from '@tenant/infrastructure/repositories/typeorm-tenant-member.repository';
import { TypeOrmTenantProfileRepository } from '@tenant/infrastructure/repositories/typeorm-tenant-profile.repository';
import { TypeOrmTenantConfigRepository } from '@tenant/infrastructure/repositories/typeorm-tenant-config.repository';
import { CreateTenantHandler } from '@tenant/application/commands/create-tenant/create-tenant.handler';
import { GetMyTenantHandler } from '@tenant/application/queries/get-my-tenant/get-my-tenant.handler';
import { GetTenantMembersHandler } from '@tenant/application/queries/get-tenant-members/get-tenant-members.handler';
import { TenantFacade } from '@tenant/application/facades/tenant.facade';
import { TenantController } from '@tenant/infrastructure/http/controllers/tenant.controller';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantEntity,
      TenantMemberEntity,
      TenantProfileEntity,
      TenantConfigEntity,
    ]),
    CqrsModule,
  ],
  controllers: [TenantController],
  providers: [
    { provide: INJECTION_TOKENS.TENANT_CONTRACT, useClass: TypeOrmTenantRepository },
    { provide: INJECTION_TOKENS.TENANT_MEMBER_CONTRACT, useClass: TypeOrmTenantMemberRepository },
    { provide: INJECTION_TOKENS.TENANT_PROFILE_CONTRACT, useClass: TypeOrmTenantProfileRepository },
    { provide: INJECTION_TOKENS.TENANT_CONFIG_CONTRACT, useClass: TypeOrmTenantConfigRepository },
    TypeOrmTenantRepository,
    TypeOrmTenantMemberRepository,
    TypeOrmTenantProfileRepository,
    TypeOrmTenantConfigRepository,
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
  ],
})
export class TenantModule {}
