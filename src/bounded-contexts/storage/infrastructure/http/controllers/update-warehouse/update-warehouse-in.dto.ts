import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateWarehouseInDto {
  @ApiPropertyOptional({ description: 'Warehouse name', minLength: 3, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  @MinLength(3)
  @MaxLength(80)
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
