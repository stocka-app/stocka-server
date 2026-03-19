import { ApiProperty } from '@nestjs/swagger';

export class InviteMemberOutDto {
  @ApiProperty({ description: 'Invitation UUID' })
  id!: string;

  @ApiProperty({ description: 'Invited email address' })
  email!: string;

  @ApiProperty({ description: 'Assigned role' })
  role!: string;

  @ApiProperty({ description: 'Invitation expiration date' })
  expiresAt!: Date;

  @ApiProperty({ description: 'Invitation creation date' })
  createdAt!: Date;

  constructor(id: string, email: string, role: string, expiresAt: Date, createdAt: Date) {
    this.id = id;
    this.email = email;
    this.role = role;
    this.expiresAt = expiresAt;
    this.createdAt = createdAt;
  }
}
