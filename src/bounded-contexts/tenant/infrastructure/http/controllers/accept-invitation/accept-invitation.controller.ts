import { Controller, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Secure } from '@common/decorators/secure.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { AcceptInvitationCommand } from '@tenant/application/commands/accept-invitation/accept-invitation.command';
import { AcceptInvitationResult } from '@tenant/application/commands/accept-invitation/accept-invitation.handler';
import { AcceptInvitationOutDto } from '@tenant/infrastructure/http/controllers/accept-invitation/accept-invitation-out.dto';

@ApiTags('Tenant Invitations')
@Controller('tenant')
@ApiBearerAuth('JWT-authentication')
export class AcceptInvitationController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('invitations/:token/accept')
  @Secure()
  @ApiOperation({ summary: 'Accept an invitation by token' })
  @ApiResponse({ status: 201, description: 'Invitation accepted', type: AcceptInvitationOutDto })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 403, description: 'Email mismatch' })
  @ApiResponse({ status: 409, description: 'Already used' })
  @ApiResponse({ status: 410, description: 'Invitation expired' })
  async handle(
    @CurrentUser() user: JwtPayload,
    @Param('token') token: string,
  ): Promise<AcceptInvitationOutDto> {
    const command = new AcceptInvitationCommand(token, user.uuid, user.email);

    const result = await this.commandBus.execute<AcceptInvitationCommand, AcceptInvitationResult>(
      command,
    );

    return result.match(
      (data) =>
        new AcceptInvitationOutDto(data.tenantUUID, data.tenantName, data.role, data.joinedAt),
      (error) => {
        throw error;
      },
    );
  }
}
