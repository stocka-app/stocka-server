import { ApiProperty } from '@nestjs/swagger';
import { TenantAggregate } from '@tenant/domain/tenant.aggregate';
import { TenantConfigModel } from '@tenant/domain/models/tenant-config.model';

export class TenantResponseDto {
  @ApiProperty()
  uuid!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  businessType!: string;

  @ApiProperty()
  country!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  tier!: string;

  static fromAggregate(
    tenant: TenantAggregate,
    config?: TenantConfigModel | null,
  ): TenantResponseDto {
    const dto = new TenantResponseDto();
    dto.uuid = tenant.uuid;
    dto.name = tenant.name;
    dto.slug = tenant.slug;
    dto.businessType = tenant.businessType;
    dto.country = tenant.country;
    dto.timezone = tenant.timezone;
    dto.status = tenant.status;
    dto.tier = config ? config.tier.toString() : 'FREE';
    return dto;
  }
}
