import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStoreRoomInDto {
  @ApiProperty({ description: 'Store room name', minLength: 1, maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Icon identifier', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  icon!: string;

  @ApiProperty({ description: 'Color hex code', example: '#FF5733' })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (e.g. #FF5733)' })
  color!: string;

  @ApiProperty({ description: 'Address', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address!: string;

  @ApiPropertyOptional({ description: 'Store room description', minLength: 5, maxLength: 300 })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ description: 'Parent storage UUID (for hierarchy)' })
  @IsOptional()
  @IsUUID()
  parentUUID?: string;
}
