import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Secure } from '@common/decorators/secure.decorator';
import {
  GetInvitationByTokenQuery,
  GetInvitationByTokenResult,
} from '@tenant/application/queries/get-invitation-by-token/get-invitation-by-token.query';
import { GetInvitationByTokenOutDto } from '@tenant/infrastructure/http/controllers/get-invitation-by-token/get-invitation-by-token-out.dto';

@ApiTags('Tenant Invitations')
@Controller('tenant')
export class GetInvitationByTokenController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('invitations/:token')
  @Secure()
  @ApiOperation({ summary: 'Preview an invitation by token (public)' })
  @ApiResponse({ status: 200, description: 'Invitation details', type: GetInvitationByTokenOutDto })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 409, description: 'Invitation already used' })
  @ApiResponse({ status: 410, description: 'Invitation expired' })
  async handle(@Param('token') token: string): Promise<GetInvitationByTokenOutDto> {
    const result = await this.queryBus.execute<
      GetInvitationByTokenQuery,
      GetInvitationByTokenResult
    >(new GetInvitationByTokenQuery(token));

    return result.match(
      (invitation) => GetInvitationByTokenOutDto.fromModel(invitation),
      (error) => {
        throw error;
      },
    );
  }
}
