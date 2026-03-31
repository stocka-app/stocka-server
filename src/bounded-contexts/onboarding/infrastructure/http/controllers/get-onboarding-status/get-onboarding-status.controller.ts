import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { GetOnboardingStatusQuery } from '@onboarding/application/queries/get-onboarding-status/get-onboarding-status.query';
import { GetOnboardingStatusResult } from '@onboarding/application/queries/get-onboarding-status/get-onboarding-status.handler';

@ApiTags('Onboarding')
@Controller('onboarding')
@ApiBearerAuth('JWT-authentication')
export class GetOnboardingStatusController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('status')
  @Secure()
  @ApiOperation({ summary: 'Get current onboarding status for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Onboarding status returned' })
  async handle(@CurrentUser() user: JwtPayload): Promise<Record<string, unknown>> {
    const session = await this.queryBus.execute<
      GetOnboardingStatusQuery,
      GetOnboardingStatusResult
    >(new GetOnboardingStatusQuery(user.uuid));

    if (!session) {
      return { status: null, currentStep: null, path: null, stepData: null };
    }

    return {
      status: session.status,
      currentStep: session.currentStep,
      path: session.path,
      stepData: session.stepData,
    };
  }
}
