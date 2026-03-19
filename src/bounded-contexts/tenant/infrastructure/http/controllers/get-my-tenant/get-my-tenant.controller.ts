import { Controller, Get, Inject, NotFoundException, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import {
  GetMyTenantQuery,
  GetMyTenantQueryResult,
} from '@tenant/application/queries/get-my-tenant/get-my-tenant.query';
import { ITenantConfigContract } from '@tenant/domain/contracts/tenant-config.contract';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { GetMyTenantOutDto } from '@tenant/infrastructure/http/controllers/get-my-tenant/get-my-tenant-out.dto';

@ApiTags('Tenant')
@Controller('tenant')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard)
export class GetMyTenantController {
  constructor(
    private readonly queryBus: QueryBus,
    @Inject(INJECTION_TOKENS.TENANT_MEMBER_CONTRACT)
    private readonly memberContract: ITenantMemberContract,
    @Inject(INJECTION_TOKENS.TENANT_CONFIG_CONTRACT)
    private readonly configContract: ITenantConfigContract,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my organization' })
  @ApiResponse({ status: 200, description: 'Returns the current tenant', type: GetMyTenantOutDto })
  @ApiResponse({ status: 404, description: 'No active membership found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async handle(@CurrentUser() user: JwtPayload): Promise<GetMyTenantOutDto> {
    const member = await this.memberContract.findActiveByUserUUID(user.uuid);
    /* istanbul ignore next */
    if (!member) {
      throw new NotFoundException('No active tenant membership found');
    }

    const result = await this.queryBus.execute<GetMyTenantQuery, GetMyTenantQueryResult>(
      new GetMyTenantQuery(member.tenantId),
    );

    /* istanbul ignore next */
    if (result.isErr()) throw result.error;

    const config = await this.configContract.findByTenantId(member.tenantId);
    return GetMyTenantOutDto.fromAggregate(result.value, config);
  }
}
