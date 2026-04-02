import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateWarehouseInDto {
  @ApiPropertyOptional({ description: 'Warehouse name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Warehouse description', minLength: 5, maxLength: 300 })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  description?: string | null;

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

  @ApiPropertyOptional({ description: 'Physical address', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}
