import { Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { StartOnboardingCommand } from '@onboarding/application/commands/start-onboarding/start-onboarding.command';
import { StartOnboardingResult } from '@onboarding/application/commands/start-onboarding/start-onboarding.handler';

@ApiTags('Onboarding')
@Controller('onboarding')
@ApiBearerAuth('JWT-authentication')
export class StartOnboardingController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('start')
  @Secure()
  @ApiOperation({ summary: 'Start or resume an onboarding session (idempotent)' })
  @ApiResponse({ status: 201, description: 'Onboarding session started or resumed' })
  @ApiResponse({ status: 409, description: 'Onboarding already completed' })
  async handle(@CurrentUser() user: JwtPayload): Promise<Record<string, unknown>> {
    const result = await this.commandBus.execute<StartOnboardingCommand, StartOnboardingResult>(
      new StartOnboardingCommand(user.uuid),
    );

    return result.match(
      (session) => ({
        status: session.status,
        currentStep: session.currentStep.getValue(),
        path: session.path,
        stepData: session.stepData,
      }),
      (error) => {
        throw error;
      },
    );
  }
}
