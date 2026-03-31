import { Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { Secure } from '@common/decorators/secure.decorator';
import { CompleteOnboardingCommand } from '@onboarding/application/commands/complete-onboarding/complete-onboarding.command';
import { CompleteOnboardingResult } from '@onboarding/application/commands/complete-onboarding/complete-onboarding.handler';

@ApiTags('Onboarding')
@Controller('onboarding')
@ApiBearerAuth('JWT-authentication')
export class CompleteOnboardingController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('complete')
  @Secure()
  @ApiOperation({
    summary: 'Complete onboarding — creates tenant + default storage or joins via invitation',
  })
  @ApiResponse({ status: 201, description: 'Onboarding completed successfully' })
  @ApiResponse({ status: 404, description: 'Onboarding session not found' })
  @ApiResponse({ status: 409, description: 'Onboarding already completed' })
  @ApiResponse({ status: 422, description: 'Required step data missing' })
  async handle(@CurrentUser() user: JwtPayload): Promise<Record<string, unknown>> {
    const result = await this.commandBus.execute<
      CompleteOnboardingCommand,
      CompleteOnboardingResult
    >(new CompleteOnboardingCommand(user.uuid, user.email));

    return result.match(
      (data) => ({
        path: data.path,
        tenantId: data.tenantId,
        tenantName: data.tenantName,
        role: data.role,
      }),
      (error) => {
        throw error;
      },
    );
  }
}
