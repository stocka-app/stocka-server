import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageItemView } from '@storage/domain/schemas';

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

  static fromItem(view: StorageItemView): StorageOutDto {
    const dto = new StorageOutDto();
    dto.uuid = view.uuid;
    dto.status = view.status;
    dto.type = view.type;
    dto.name = view.name;
    dto.description = view.description;
    dto.icon = view.icon;
    dto.color = view.color;
    dto.address = view.address;
    dto.roomType = view.roomType;
    dto.createdAt = view.createdAt;
    dto.updatedAt = view.updatedAt;
    dto.archivedAt = view.archivedAt;
    dto.frozenAt = view.frozenAt;
    return dto;
  }
}
