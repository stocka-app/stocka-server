import { ApiProperty } from '@nestjs/swagger';
import { TierLimits } from '@tenant/domain/contracts/tenant-facade.contract';

export class TenantCapabilitiesOutDto {
  @ApiProperty({ example: 'STARTER' })
  tier: string;

  @ApiProperty({ example: 3 })
  maxCustomRooms: number;

  @ApiProperty({ example: 3 })
  maxStoreRooms: number;

  @ApiProperty({ example: 1 })
  maxWarehouses: number;

  static fromTierLimits(limits: TierLimits): TenantCapabilitiesOutDto {
    const dto = new TenantCapabilitiesOutDto();
    dto.tier = limits.tier;
    dto.maxCustomRooms = limits.maxCustomRooms;
    dto.maxStoreRooms = limits.maxStoreRooms;
    dto.maxWarehouses = limits.maxWarehouses;
    return dto;
  }
}
