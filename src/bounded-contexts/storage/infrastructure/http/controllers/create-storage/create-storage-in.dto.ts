import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

export class CreateStorageInDto {
  @ApiProperty({ enum: StorageType, description: 'Type of storage' })
  @IsEnum(StorageType)
  type!: StorageType;

  @ApiProperty({ description: 'Storage name', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

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
