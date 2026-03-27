import { Body, Controller, Headers, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { SaveOnboardingStepCommand } from '@onboarding/application/commands/save-onboarding-step/save-onboarding-step.command';
import { SaveOnboardingStepResult } from '@onboarding/application/commands/save-onboarding-step/save-onboarding-step.handler';
import { SaveOnboardingStepInDto } from '@onboarding/infrastructure/http/controllers/save-onboarding-step/save-onboarding-step-in.dto';

/** Normalize Accept-Language to a supported locale ('es' | 'en'). */
function normalizeLocale(header?: string): string {
  if (!header) return 'es';
  const primary = header.split(',')[0].trim().toLowerCase();
  return primary.startsWith('en') ? 'en' : 'es';
}

@ApiTags('Onboarding')
@Controller('onboarding')
@ApiBearerAuth('JWT-authentication')
@UseGuards(JwtAuthenticationGuard)
export class SaveOnboardingStepController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly mediator: MediatorService,
  ) {}

  @Patch('progress')
  @ApiOperation({ summary: 'Save progress for an onboarding section' })
  @ApiResponse({ status: 200, description: 'Section data saved' })
  @ApiResponse({ status: 404, description: 'Onboarding session not found' })
  @ApiResponse({ status: 409, description: 'Onboarding already completed' })
  async handle(
    @Body() dto: SaveOnboardingStepInDto,
    @CurrentUser() user: JwtPayload,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<Record<string, unknown>> {
    const result = await this.commandBus.execute<
      SaveOnboardingStepCommand,
      SaveOnboardingStepResult
    >(new SaveOnboardingStepCommand(user.uuid, dto.section, dto.data, dto.currentStep));

    // Sync the user's locale on every progress save — the frontend sends
    // Accept-Language on every request, so if the user toggles language
    // mid-onboarding, the DB stays in sync for emails and future sessions.
    const locale = normalizeLocale(acceptLanguage);
    this.mediator.user.updateLocale(user.uuid, locale).catch(() => {});

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
