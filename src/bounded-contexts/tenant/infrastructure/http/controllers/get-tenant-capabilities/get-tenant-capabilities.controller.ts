import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { TenantCapabilitiesOutDto } from '@tenant/infrastructure/http/controllers/get-tenant-capabilities/tenant-capabilities-out.dto';

@ApiTags('Tenant')
@Controller('tenants')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard)
export class GetTenantCapabilitiesController {
  constructor(private readonly mediator: MediatorService) {}

  @Get('me/capabilities')
  @ApiOperation({ summary: 'Get tier limits for the current tenant' })
  @ApiResponse({
    status: 200,
    description: 'Returns the storage tier limits for the current tenant',
    type: TenantCapabilitiesOutDto,
  })
  @ApiResponse({ status: 404, description: 'User has no active tenant' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async handle(@CurrentUser() user: JwtPayload): Promise<TenantCapabilitiesOutDto> {
    const tierLimits = await this.mediator.tenant.getTierLimits(user.uuid);

    if (!tierLimits) {
      throw new NotFoundException('No active tenant found for the current user');
    }

    return TenantCapabilitiesOutDto.fromTierLimits(tierLimits);
  }
}
