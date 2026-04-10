import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

export class UpdateStorageInDto {
  @ApiPropertyOptional({ description: 'Storage name', minLength: 3, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  @MinLength(3)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ enum: StorageType, description: 'Change storage type' })
  @IsOptional()
  @IsEnum(StorageType)
  type?: StorageType;

  @ApiPropertyOptional({ description: 'Description (null to clear)', minLength: 5, maxLength: 300 })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  description?: string | null;

  @ApiPropertyOptional({ description: 'Physical address (required for WAREHOUSE)', minLength: 8, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  address?: string | null;

  @ApiPropertyOptional({ description: 'Icon name (only effective for CUSTOM_ROOM)' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Color hex (only effective for CUSTOM_ROOM)' })
  @IsOptional()
  @IsString()
  color?: string;
}
