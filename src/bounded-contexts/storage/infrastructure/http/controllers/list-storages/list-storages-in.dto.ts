import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

export class ListStoragesInDto {
  @ApiPropertyOptional({ enum: StorageStatus, description: 'Filter by storage status. Omit to return all statuses.' })
  @IsOptional()
  @IsEnum(StorageStatus)
  status?: StorageStatus;

  @ApiPropertyOptional({ enum: StorageType, description: 'Filter by storage type' })
  @IsOptional()
  @IsEnum(StorageType)
  type?: StorageType;

  @ApiPropertyOptional({ description: 'Page number (starts at 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (max 100)', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;

  @ApiPropertyOptional({ description: 'Search by name (case-insensitive)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], description: 'Sort order by name', default: 'ASC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder: 'ASC' | 'DESC' = 'ASC';
}
