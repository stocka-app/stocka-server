import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsString, IsOptional, IsNumber } from 'class-validator';

export class SaveOnboardingStepInDto {
  @ApiProperty({ description: 'Domain section name (consents, path, preferences, businessProfile, context)' })
  @IsString()
  section!: string;

  @ApiProperty({ description: 'Section data payload' })
  @IsObject()
  data!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Current step number for progress tracking' })
  @IsOptional()
  @IsNumber()
  currentStep?: number;
}
