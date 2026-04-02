import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Physical address', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}
