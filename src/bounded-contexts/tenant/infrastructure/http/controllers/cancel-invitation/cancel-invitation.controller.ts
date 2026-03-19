import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { TenantGuard } from '@common/guards/tenant.guard';
import { TenantStateGuard } from '@common/guards/tenant-state.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { SystemAction } from '@shared/domain/policy/actions-catalog';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { CancelInvitationCommand } from '@tenant/application/commands/cancel-invitation/cancel-invitation.command';
import { CancelInvitationResult } from '@tenant/application/commands/cancel-invitation/cancel-invitation.handler';

@ApiTags('Tenant Invitations')
@Controller('tenant')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard, TenantGuard, TenantStateGuard)
export class CancelInvitationController {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject(INJECTION_TOKENS.TENANT_MEMBER_CONTRACT)
    private readonly memberContract: ITenantMemberContract,
  ) {}

  @Delete('me/invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAction(SystemAction.MEMBER_INVITE)
  @ApiOperation({ summary: 'Cancel a pending invitation' })
  @ApiResponse({ status: 204, description: 'Invitation cancelled' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 409, description: 'Invitation already accepted' })
  async handle(@CurrentUser() user: JwtPayload, @Param('id') id: string): Promise<void> {
    const member = await this.memberContract.findActiveByUserUUID(user.uuid);
    /* istanbul ignore next */
    if (!member) {
      throw new NotFoundException('No active tenant membership found');
    }

    const command = new CancelInvitationCommand(
      id,
      member.tenantId,
      member.userId,
      member.role.toString(),
    );

    const result = await this.commandBus.execute<CancelInvitationCommand, CancelInvitationResult>(
      command,
    );

    result.match(
      () => undefined,
      (error) => {
        throw error;
      },
    );
  }
}
