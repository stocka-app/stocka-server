import { ApiProperty } from '@nestjs/swagger';

export class GetMeOutDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User unique identifier (UUID)',
  })
  id!: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email!: string;

  @ApiProperty({
    example: 'johndoe',
    description: 'User username',
  })
  username!: string;

  @ApiProperty({
    example: 'Roberto Eduardo Medina Austin',
    description: 'User display name from OAuth provider',
    nullable: true,
  })
  displayName!: string | null;

  @ApiProperty({
    example: 'Roberto',
    description: 'Given name from OAuth provider social profile',
    nullable: true,
  })
  givenName!: string | null;

  @ApiProperty({
    example: 'Medina',
    description: 'Family name from OAuth provider social profile',
    nullable: true,
  })
  familyName!: string | null;

  @ApiProperty({
    example: 'https://lh3.googleusercontent.com/...',
    description: 'Avatar URL from OAuth provider',
    nullable: true,
  })
  avatarUrl!: string | null;

  @ApiProperty({
    example: 'active',
    description: 'User account status',
    enum: ['pending_verification', 'active', 'email_verified_by_provider', 'archived', 'blocked'],
  })
  status!: string;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'User creation date in ISO 8601 format',
  })
  createdAt!: string;
}
