import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshSessionOutDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'New JWT access token',
  })
  accessToken!: string;

  @ApiPropertyOptional({ example: 'johndoe', description: 'Username' })
  username!: string | null;

  @ApiPropertyOptional({ example: 'John', description: 'Given name from social profile' })
  givenName!: string | null;

  @ApiPropertyOptional({ example: 'Doe', description: 'Family name from social profile' })
  familyName!: string | null;

  @ApiPropertyOptional({ example: 'https://lh3.google.com/...', description: 'Avatar URL' })
  avatarUrl!: string | null;

  @ApiPropertyOptional({
    example: 'COMPLETED',
    enum: ['IN_PROGRESS', 'COMPLETED'],
    nullable: true,
    description: 'Onboarding status — null means no session exists yet',
  })
  onboardingStatus!: string | null;
}
