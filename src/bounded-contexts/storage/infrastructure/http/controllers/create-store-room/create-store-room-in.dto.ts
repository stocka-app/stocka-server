import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStoreRoomInDto {
  @ApiProperty({ description: 'Store room name', minLength: 1, maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

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
}
