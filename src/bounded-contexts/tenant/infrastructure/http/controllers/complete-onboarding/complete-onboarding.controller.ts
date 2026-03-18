import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { CreateTenantCommand } from '@tenant/application/commands/create-tenant/create-tenant.command';
import { CompleteOnboardingInDto } from '@tenant/infrastructure/http/controllers/complete-onboarding/complete-onboarding-in.dto';
import {
  CompleteOnboardingOutDto,
  CreateTenantResult,
} from '@tenant/infrastructure/http/controllers/complete-onboarding/complete-onboarding-out.dto';

@ApiTags('Tenant')
@Controller('tenant')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard)
export class CompleteOnboardingController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('onboarding/complete')
  @ApiOperation({ summary: 'Complete onboarding and create organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    type: CompleteOnboardingOutDto,
  })
  @ApiResponse({ status: 409, description: 'Onboarding already completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async handle(
    @Body() dto: CompleteOnboardingInDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CompleteOnboardingOutDto> {
    const command = new CreateTenantCommand(
      user.uuid,
      dto.name,
      dto.businessType,
      dto.country,
      dto.timezone,
    );

    const result = await this.commandBus.execute<CreateTenantCommand, CreateTenantResult>(command);

    return result.match(
      (tenant) => {
        return new CompleteOnboardingOutDto(tenant.id, tenant.name);
      },
      (error) => {
        throw error;
      },
    );
  }
}
