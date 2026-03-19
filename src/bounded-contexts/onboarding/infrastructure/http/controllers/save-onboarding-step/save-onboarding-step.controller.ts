import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { SaveOnboardingStepCommand } from '@onboarding/application/commands/save-onboarding-step/save-onboarding-step.command';
import { SaveOnboardingStepResult } from '@onboarding/application/commands/save-onboarding-step/save-onboarding-step.handler';
import { SaveOnboardingStepInDto } from '@onboarding/infrastructure/http/controllers/save-onboarding-step/save-onboarding-step-in.dto';

@ApiTags('Onboarding')
@Controller('onboarding')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard)
export class SaveOnboardingStepController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('step/:step')
  @ApiOperation({ summary: 'Save progress for an onboarding step (0-7)' })
  @ApiParam({ name: 'step', type: Number, description: 'Step number (0-7)' })
  @ApiResponse({ status: 201, description: 'Step data saved' })
  @ApiResponse({ status: 404, description: 'Onboarding session not found' })
  @ApiResponse({ status: 409, description: 'Onboarding already completed' })
  async handle(
    @Param('step', ParseIntPipe) step: number,
    @Body() dto: SaveOnboardingStepInDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Record<string, unknown>> {
    const result = await this.commandBus.execute<
      SaveOnboardingStepCommand,
      SaveOnboardingStepResult
    >(new SaveOnboardingStepCommand(user.uuid, step, dto.data));

    return result.match(
      (session) => ({
        status: session.status,
        currentStep: session.currentStep,
        path: session.path,
      }),
      (error) => {
        throw error;
      },
    );
  }
}
