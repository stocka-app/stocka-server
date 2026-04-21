import { ApiProperty } from '@nestjs/swagger';
import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';

export class GetInvitationByTokenOutDto {
  @ApiProperty({ description: 'Invitation UUID' })
  id!: string;

  @ApiProperty({ description: 'Name of the inviting organization' })
  tenantName!: string;

  @ApiProperty({ description: 'Invited email address' })
  email!: string;

  @ApiProperty({ description: 'Assigned role' })
  role!: string;

  @ApiProperty({ description: 'Invitation expiration date' })
  expiresAt!: Date;

  static fromModel(model: TenantInvitationModel): GetInvitationByTokenOutDto {
    const dto = new GetInvitationByTokenOutDto();
    dto.id = model.id;
    dto.tenantName = model.tenantName.getValue();
    dto.email = model.email;
    dto.role = model.role;
    dto.expiresAt = model.expiresAt;
    return dto;
  }
}
