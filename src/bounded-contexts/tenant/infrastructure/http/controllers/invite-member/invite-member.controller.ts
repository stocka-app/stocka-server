import { Body, Controller, Inject, NotFoundException, Post, UseGuards } from '@nestjs/common';
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
import { ITenantContract } from '@tenant/domain/contracts/tenant.contract';
import { InviteMemberCommand } from '@tenant/application/commands/invite-member/invite-member.command';
import { InviteMemberResult } from '@tenant/application/commands/invite-member/invite-member.handler';
import { InviteMemberInDto } from '@tenant/infrastructure/http/controllers/invite-member/invite-member-in.dto';
import { InviteMemberOutDto } from '@tenant/infrastructure/http/controllers/invite-member/invite-member-out.dto';

@ApiTags('Tenant Invitations')
@Controller('tenant')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard, TenantGuard, TenantStateGuard)
export class InviteMemberController {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject(INJECTION_TOKENS.TENANT_MEMBER_CONTRACT)
    private readonly memberContract: ITenantMemberContract,
    @Inject(INJECTION_TOKENS.TENANT_CONTRACT)
    private readonly tenantContract: ITenantContract,
  ) {}

  @Post('me/invitations')
  @RequireAction(SystemAction.MEMBER_INVITE)
  @ApiOperation({ summary: 'Invite a member to the current tenant' })
  @ApiResponse({ status: 201, description: 'Invitation created', type: InviteMemberOutDto })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Pending invitation already exists' })
  async handle(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InviteMemberInDto,
  ): Promise<InviteMemberOutDto> {
    const member = await this.memberContract.findActiveByUserUUID(user.uuid);
    if (!member) {
      throw new NotFoundException('No active tenant membership found');
    }

    const tenant = await this.tenantContract.findById(member.tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const command = new InviteMemberCommand(
      member.tenantId,
      tenant.uuid,
      tenant.name,
      member.userId,
      member.role.toString(),
      dto.email,
      dto.role,
    );

    const result = await this.commandBus.execute<InviteMemberCommand, InviteMemberResult>(command);

    return result.match(
      (data) =>
        new InviteMemberOutDto(data.id, data.email, data.role, data.expiresAt, data.createdAt),
      (error) => {
        throw error;
      },
    );
  }
}
