import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';

export class StorageOutDto {
  @ApiProperty({ description: 'Storage UUID' })
  uuid!: string;

  @ApiProperty({ enum: StorageStatus, description: 'Storage status' })
  status!: StorageStatus;

  @ApiProperty({ description: 'Storage type' })
  type!: string;

  @ApiProperty({ description: 'Storage name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Storage description' })
  description!: string | null;

  @ApiProperty({ description: 'Icon identifier' })
  icon!: string;

  @ApiProperty({ description: 'Color hex code' })
  color!: string;

  @ApiPropertyOptional({ description: 'Parent storage UUID (null if root)' })
  parentId!: string | null;

  @ApiProperty({ description: 'Address' })
  address!: string;

  @ApiPropertyOptional({ description: 'Room type (for CUSTOM_ROOM)' })
  roomType!: string | null;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Archived date (null if active)' })
  archivedAt!: Date | null;

  @ApiPropertyOptional({ description: 'Frozen date (null if not frozen)' })
  frozenAt!: Date | null;

  static fromAggregate(aggregate: StorageAggregate): StorageOutDto {
    const dto = new StorageOutDto();
    dto.uuid = aggregate.uuid;
    dto.status = aggregate.status;
    dto.type = aggregate.type;
    dto.name = aggregate.name;
    dto.description = aggregate.description;
    dto.icon = aggregate.icon;
    dto.color = aggregate.color;
    dto.parentId = aggregate.parentUUID;
    dto.address = aggregate.address;
    dto.roomType = aggregate.customRoom?.roomType.getValue() ?? null;
    dto.createdAt = aggregate.createdAt;
    dto.updatedAt = aggregate.updatedAt;
    dto.archivedAt = aggregate.archivedAt;
    dto.frozenAt = aggregate.frozenAt;
    return dto;
  }
}
