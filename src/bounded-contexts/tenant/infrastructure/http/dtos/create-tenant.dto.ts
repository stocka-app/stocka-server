import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsEnum, IsOptional, Length } from 'class-validator';
import { BusinessTypeEnum } from '@tenant/domain/value-objects/business-type.vo';

export class CreateTenantDto {
  @ApiProperty({ description: 'Organization name', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ enum: BusinessTypeEnum, description: 'Type of business' })
  @IsEnum(BusinessTypeEnum)
  businessType!: string;

  @ApiPropertyOptional({ description: 'Country code (ISO 3166-1 alpha-2)', default: 'MX' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ description: 'IANA timezone', default: 'America/Mexico_City' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
