import { Controller, Get, Inject, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Secure } from '@common/decorators/secure.decorator';
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
export class GetInvitationsController {
  constructor(
    private readonly queryBus: QueryBus,
    @Inject(INJECTION_TOKENS.TENANT_MEMBER_CONTRACT)
    private readonly memberContract: ITenantMemberContract,
  ) {}

  @Get('me/invitations')
  @Secure()
  @ApiOperation({ summary: 'List all invitations for the current tenant' })
  @ApiResponse({ status: 200, description: 'Invitations list', type: [InvitationOutDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async handle(@CurrentUser() user: JwtPayload): Promise<InvitationOutDto[]> {
    const member = await this.memberContract.findActiveByUserUUID(user.uuid);
    /* istanbul ignore next */
    if (!member) {
      throw new NotFoundException('No active tenant membership found');
    }

    const result = await this.queryBus.execute<GetInvitationsQuery, GetInvitationsResult>(
      new GetInvitationsQuery(member.tenantId),
    );

    return result.match(
      (invitations) => invitations.map((inv) => InvitationOutDto.fromModel(inv)),
      /* istanbul ignore next */
      (error) => {
        throw error;
      },
    );
  }
}
