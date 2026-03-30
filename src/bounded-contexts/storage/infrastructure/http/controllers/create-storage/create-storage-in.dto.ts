import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

export class CreateStorageInDto {
  @ApiProperty({ enum: StorageType, description: 'Type of storage' })
  @IsEnum(StorageType)
  type!: StorageType;

  @ApiProperty({ description: 'Storage name', minLength: 2, maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ description: 'Storage description', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ description: 'Address (required for WAREHOUSE)', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ description: 'Room type category (for CUSTOM_ROOM)', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  roomType?: string;
}
