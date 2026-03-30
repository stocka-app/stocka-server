import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateStorageInDto {
  @ApiPropertyOptional({ description: 'Updated storage name', minLength: 2, maxLength: 80 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;
}
