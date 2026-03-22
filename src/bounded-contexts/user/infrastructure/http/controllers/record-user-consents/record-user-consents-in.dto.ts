import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, Equals } from 'class-validator';

export class RecordUserConsentsInDto {
  @ApiProperty({ description: 'User accepted Terms of Service and Privacy Policy (must be true)' })
  @IsBoolean()
  @Equals(true, { message: 'You must accept the Terms of Service to continue' })
  terms!: boolean;

  @ApiProperty({ description: 'User opted into marketing communications' })
  @IsBoolean()
  marketing!: boolean;

  @ApiProperty({ description: 'User opted into anonymous analytics' })
  @IsBoolean()
  analytics!: boolean;
}
