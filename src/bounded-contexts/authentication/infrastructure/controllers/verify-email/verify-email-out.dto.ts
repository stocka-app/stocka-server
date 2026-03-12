import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailOutDto {
  @ApiProperty({
    example: true,
    description: 'Indicates if the verification was successful',
  })
  success!: boolean;

  @ApiProperty({
    example: 'Email verified successfully',
    description: 'Response message',
  })
  message!: string;
}
