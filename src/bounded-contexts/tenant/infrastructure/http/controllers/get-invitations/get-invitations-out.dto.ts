import { ApiProperty } from '@nestjs/swagger';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';

export class InvitationOutDto {
  @ApiProperty({ description: 'Invitation UUID' })
  id!: string;

  @ApiProperty({ description: 'Invited email address' })
  email!: string;

  @ApiProperty({ description: 'Assigned role' })
  role!: string;

  @ApiProperty({ description: 'Whether the invitation was accepted', nullable: true })
  acceptedAt!: Date | null;

  @ApiProperty({ description: 'Invitation expiration date' })
  expiresAt!: Date;

  @ApiProperty({ description: 'Invitation creation date' })
  createdAt!: Date;

  static fromModel(model: TenantInvitationModel): InvitationOutDto {
    const dto = new InvitationOutDto();
    dto.id = model.id;
    dto.email = model.email;
    dto.role = model.role;
    dto.acceptedAt = model.acceptedAt;
    dto.expiresAt = model.expiresAt;
    dto.createdAt = model.createdAt;
    return dto;
  }
}
