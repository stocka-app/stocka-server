import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateStoreRoomInDto {
  @ApiPropertyOptional({ description: 'Store room name', minLength: 3, maxLength: 80 })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  @MinLength(3)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ description: 'Store room description', minLength: 5, maxLength: 300 })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  description?: string | null;

  @ApiPropertyOptional({ description: 'Address (null or empty clears the value)', maxLength: 200 })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(200)
  address?: string | null;
}
