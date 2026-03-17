import { Controller, Post, Get, Body, UseGuards, Inject, NotFoundException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { CreateTenantDto } from '@tenant/infrastructure/http/dtos/create-tenant.dto';
import { TenantResponseDto } from '@tenant/infrastructure/http/dtos/tenant-response.dto';
import {
  CreateTenantCommand,
  CreateTenantCommandResult,
} from '@tenant/application/commands/create-tenant/create-tenant.command';
import {
  GetMyTenantQuery,
  GetMyTenantQueryResult,
} from '@tenant/application/queries/get-my-tenant/get-my-tenant.query';
import { ITenantMemberContract } from '@tenant/domain/contracts/tenant-member.contract';
import { ITenantConfigContract } from '@tenant/domain/contracts/tenant-config.contract';
import { IUserFacade } from '@shared/domain/contracts/user-facade.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@ApiTags('Tenant')
@Controller('tenant')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard)
export class TenantController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(INJECTION_TOKENS.TENANT_MEMBER_CONTRACT)
    private readonly memberContract: ITenantMemberContract,
    @Inject(INJECTION_TOKENS.TENANT_CONFIG_CONTRACT)
    private readonly configContract: ITenantConfigContract,
    @Inject(INJECTION_TOKENS.USER_FACADE)
    private readonly userFacade: IUserFacade,
  ) {}

  @Post('onboarding/complete')
  @ApiOperation({ summary: 'Complete onboarding and create organization' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  @ApiResponse({ status: 409, description: 'Onboarding already completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async completeOnboarding(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ tenantUUID: string }> {
    const userAggregate = await this.userFacade.findByUUID(user.uuid);
    if (!userAggregate || userAggregate.id === undefined) {
      throw new NotFoundException('User not found');
    }

    const command = new CreateTenantCommand(
      userAggregate.id,
      user.uuid,
      dto.name,
      dto.businessType,
      dto.country ?? 'MX',
      dto.timezone ?? 'America/Mexico_City',
    );

    const result = await this.commandBus.execute<CreateTenantCommand, CreateTenantCommandResult>(
      command,
    );

    if (result.isErr()) throw result.error;
    return result.value;
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my organization' })
  @ApiResponse({ status: 200, description: 'Returns the current tenant', type: TenantResponseDto })
  @ApiResponse({ status: 404, description: 'No active membership found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyTenant(@CurrentUser() user: JwtPayload): Promise<TenantResponseDto> {
    const member = await this.memberContract.findActiveByUserUUID(user.uuid);
    if (!member) {
      throw new NotFoundException('No active tenant membership found');
    }

    const result = await this.queryBus.execute<GetMyTenantQuery, GetMyTenantQueryResult>(
      new GetMyTenantQuery(member.tenantId),
    );

    if (result.isErr()) throw result.error;

    const config = await this.configContract.findByTenantId(member.tenantId);
    return TenantResponseDto.fromAggregate(result.value, config);
  }
}
