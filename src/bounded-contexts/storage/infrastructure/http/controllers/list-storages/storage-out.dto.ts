import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';

export class StorageOutDto {
  @ApiProperty({ description: 'Storage UUID' })
  uuid!: string;

  @ApiProperty({ description: 'Storage type' })
  type!: string;

  @ApiProperty({ description: 'Storage name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Address' })
  address!: string | null;

  @ApiPropertyOptional({ description: 'Room type (for CUSTOM_ROOM)' })
  roomType!: string | null;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;

  static fromAggregate(aggregate: StorageAggregate): StorageOutDto {
    const dto = new StorageOutDto();
    dto.uuid = aggregate.uuid;
    dto.type = aggregate.type;
    dto.name = aggregate.name;
    dto.address = aggregate.address;
    dto.roomType = aggregate.customRoom?.roomType ?? null;
    dto.createdAt = aggregate.createdAt;
    dto.updatedAt = aggregate.updatedAt;
    return dto;
  }
}
