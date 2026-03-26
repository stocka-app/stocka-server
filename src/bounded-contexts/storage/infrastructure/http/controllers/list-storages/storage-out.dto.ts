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

  @ApiPropertyOptional({ description: 'Address' })
  address!: string | null;

  @ApiPropertyOptional({ description: 'Room type (for CUSTOM_ROOM)' })
  roomType!: string | null;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Archived date (null if active)' })
  archivedAt!: Date | null;

  static fromAggregate(aggregate: StorageAggregate): StorageOutDto {
    const dto = new StorageOutDto();
    dto.uuid = aggregate.uuid;
    dto.status = aggregate.status;
    dto.type = aggregate.type;
    dto.name = aggregate.name;
    dto.description = aggregate.description;
    dto.address = aggregate.address;
    dto.roomType = aggregate.customRoom?.roomType ?? null;
    dto.createdAt = aggregate.createdAt;
    dto.updatedAt = aggregate.updatedAt;
    dto.archivedAt = aggregate.archivedAt;
    return dto;
  }
}
