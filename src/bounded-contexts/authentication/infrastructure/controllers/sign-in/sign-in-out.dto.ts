import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserOutDto } from '@authentication/infrastructure/controllers/sign-up/sign-up-out.dto';

export class SignInUserOutDto extends UserOutDto {
  @ApiPropertyOptional({ example: 'John', description: 'Given name from social profile' })
  givenName!: string | null;

  @ApiPropertyOptional({ example: 'Doe', description: 'Family name from social profile' })
  familyName!: string | null;

  @ApiPropertyOptional({ example: 'https://lh3.google.com/...', description: 'Avatar URL from social profile' })
  avatarUrl!: string | null;
}

export class SignInOutDto {
  @ApiProperty({ type: SignInUserOutDto })
  user!: SignInUserOutDto;

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

  @ApiPropertyOptional({
    example: 'COMPLETED',
    enum: ['IN_PROGRESS', 'COMPLETED'],
    nullable: true,
    description: 'Onboarding status — null means no session exists yet',
  })
  onboardingStatus!: string | null;
}
