import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

export class ListStoragesInDto {
  @ApiPropertyOptional({ enum: StorageStatus, description: 'Filter by storage status' })
  @IsOptional()
  @IsEnum(StorageStatus)
  status?: StorageStatus;

  @ApiPropertyOptional({ enum: StorageType, description: 'Filter by storage type' })
  @IsOptional()
  @IsEnum(StorageType)
  type?: StorageType;
}
