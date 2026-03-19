import { Controller, Get, Inject, NotFoundException, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { TenantGuard } from '@common/guards/tenant.guard';
import { TenantStateGuard } from '@common/guards/tenant-state.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import {
  GetInvitationsQuery,
  GetInvitationsResult,
} from '@tenant/application/queries/get-invitations/get-invitations.query';
import { InvitationOutDto } from '@tenant/infrastructure/http/controllers/get-invitations/get-invitations-out.dto';

@ApiTags('Tenant Invitations')
@Controller('tenant')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard, TenantGuard, TenantStateGuard)
export class GetInvitationsController {
  constructor(
    private readonly queryBus: QueryBus,
    @Inject(INJECTION_TOKENS.TENANT_MEMBER_CONTRACT)
    private readonly memberContract: ITenantMemberContract,
  ) {}

  @Get('me/invitations')
  @ApiOperation({ summary: 'List all invitations for the current tenant' })
  @ApiResponse({ status: 200, description: 'Invitations list', type: [InvitationOutDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async handle(@CurrentUser() user: JwtPayload): Promise<InvitationOutDto[]> {
    const member = await this.memberContract.findActiveByUserUUID(user.uuid);
    if (!member) {
      throw new NotFoundException('No active tenant membership found');
    }

    const result = await this.queryBus.execute<GetInvitationsQuery, GetInvitationsResult>(
      new GetInvitationsQuery(member.tenantId),
    );

    if (result.isErr()) throw result.error;

    return result.value.map((inv) => InvitationOutDto.fromModel(inv));
  }
}
