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
    example: '2024-01-01T00:00:00.000Z',
    description: 'User creation date in ISO 8601 format',
  })
  createdAt!: string;
}
