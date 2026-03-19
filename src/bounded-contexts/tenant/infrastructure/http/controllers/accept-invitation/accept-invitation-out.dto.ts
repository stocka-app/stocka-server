import { ApiProperty } from '@nestjs/swagger';

export class AcceptInvitationOutDto {
  @ApiProperty({ description: 'Tenant UUID the user joined' })
  tenantUUID!: string;

  @ApiProperty({ description: 'Tenant name' })
  tenantName!: string;

  @ApiProperty({ description: 'Role assigned to the new member' })
  role!: string;

  @ApiProperty({ description: 'Date when the member joined' })
  joinedAt!: Date;

  constructor(tenantUUID: string, tenantName: string, role: string, joinedAt: Date) {
    this.tenantUUID = tenantUUID;
    this.tenantName = tenantName;
    this.role = role;
    this.joinedAt = joinedAt;
  }
}
