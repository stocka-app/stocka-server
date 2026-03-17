import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsTimeZone, Length, MaxLength } from 'class-validator';
import { BusinessTypeEnum } from '@tenant/domain/value-objects/business-type.vo';
import { IsCountryCode } from '@common/decorators/country-code.decorator';

export class CompleteOnboardingInDto {
  @ApiProperty({ description: 'Organization name', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ enum: BusinessTypeEnum, description: 'Type of business' })
  @IsEnum(BusinessTypeEnum)
  businessType!: string;

  @ApiPropertyOptional({ description: 'Country code (ISO 3166-1 alpha-2)' })
  @IsString()
  @Length(2, 2)
  @IsCountryCode()
  country!: string;

  @ApiPropertyOptional({ description: 'IANA timezone' })
  @IsString()
  @IsTimeZone()
  timezone!: string;
}
