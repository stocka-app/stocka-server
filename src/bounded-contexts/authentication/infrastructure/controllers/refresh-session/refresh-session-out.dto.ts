import { ApiProperty } from '@nestjs/swagger';

export class RefreshSessionOutDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'New JWT access token',
  })
  accessToken!: string;
}
