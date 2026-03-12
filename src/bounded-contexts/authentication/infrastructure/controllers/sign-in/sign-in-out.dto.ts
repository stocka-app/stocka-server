import { ApiProperty } from '@nestjs/swagger';
import { UserOutDto } from '@authentication/infrastructure/controllers/sign-up/sign-up-out.dto';

export class SignInOutDto {
  @ApiProperty({ type: UserOutDto })
  user!: UserOutDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken!: string;

  @ApiProperty({
    example: false,
    description: 'Whether email verification is required before accessing the app',
  })
  emailVerificationRequired!: boolean;
}
