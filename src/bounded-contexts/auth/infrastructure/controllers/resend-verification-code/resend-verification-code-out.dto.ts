import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationCodeOutDto {
  @ApiProperty({
    example: true,
    description: 'Indicates if the code was resent successfully',
  })
  success!: boolean;

  @ApiProperty({
    example: 'Verification code resent successfully.',
    description: 'Response message',
  })
  message!: string;

  @ApiProperty({
    example: 60,
    description: 'Seconds to wait before requesting another code',
    required: false,
  })
  cooldownSeconds?: number;

  @ApiProperty({
    example: 4,
    description: 'Number of resend attempts remaining',
    required: false,
  })
  remainingResends?: number;
}
