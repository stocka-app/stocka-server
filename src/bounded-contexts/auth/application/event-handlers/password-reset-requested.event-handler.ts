import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordResetRequestedEvent } from '@auth/domain/events/password-reset-requested.event';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';

@EventsHandler(PasswordResetRequestedEvent)
export class PasswordResetRequestedEventHandler implements IEventHandler<PasswordResetRequestedEvent> {
  private readonly logger = new Logger(PasswordResetRequestedEventHandler.name);

  constructor(
    @Inject(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
    private readonly emailProvider: IEmailProviderContract,
    private readonly configService: ConfigService,
  ) {}

  async handle(event: PasswordResetRequestedEvent): Promise<void> {
    this.logger.log(`Password reset requested: userId=${event.userId}`);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/auth/reset-password?token=${event.token}`;

    const result = await this.emailProvider.sendPasswordResetEmail(
      event.email,
      resetLink,
      event.email,
      event.lang,
      event.isSocialAccount,
      event.provider,
    );

    if (result.success) {
      this.logger.log(`Password reset email sent: emailId=${result.id}`);
    } else {
      this.logger.error(`Failed to send password reset email: ${result.error}`);
    }
  }
}
