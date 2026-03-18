import { NotFoundException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

export class CompleteOnboardingOutDto {
  @ApiProperty({ description: 'Created tenant UUID' })
  tenantId!: string;

  @ApiProperty({ description: 'Created tenant name' })
  name!: string;

  constructor(tenantId: string, name: string) {
    this.tenantId = tenantId;
    this.name = name;
  }
}

export type CreateTenantErrors = NotFoundException | DomainException;
export type CreateTenantSuccess = {
  id: string;
  name: string;
};
export type CreateTenantResult = Result<CreateTenantSuccess, CreateTenantErrors>;
