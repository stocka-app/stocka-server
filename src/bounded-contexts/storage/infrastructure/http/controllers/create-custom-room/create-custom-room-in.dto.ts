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

export class CreateCustomRoomInDto {
  @ApiProperty({ description: 'Room name', minLength: 1, maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Room type category (e.g. Office, Kitchen, Storage)', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  roomType!: string;

  @ApiProperty({ description: 'Address', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address!: string;

  @ApiPropertyOptional({ description: 'Room description', minLength: 5, maxLength: 300 })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ description: 'Parent storage UUID (for hierarchy)' })
  @IsOptional()
  @IsUUID()
  parentUUID?: string;

  @ApiPropertyOptional({ description: 'Icon identifier', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional({ description: 'Color hex code', example: '#FF5733' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (e.g. #FF5733)' })
  color?: string;
}
