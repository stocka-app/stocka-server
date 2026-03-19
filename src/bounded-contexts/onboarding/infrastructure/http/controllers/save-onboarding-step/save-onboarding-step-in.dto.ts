import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class SaveOnboardingStepInDto {
  @ApiPropertyOptional({ description: 'Step data payload' })
  @IsObject()
  data!: Record<string, unknown>;
}
