import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordResetRequestedEvent } from '@authentication/domain/events/password-reset-requested.event';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { withRetry } from '@shared/domain/utils/with-retry';

const RETRY_OPTIONS = { maxAttempts: 3, backoffMs: 1000 };

@EventsHandler(PasswordResetRequestedEvent)
export class PasswordResetRequestedEventHandler implements IEventHandler<PasswordResetRequestedEvent> {
  private readonly logger = new Logger(PasswordResetRequestedEventHandler.name);

  constructor(
    @Inject(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
    private readonly emailProvider: IEmailProviderContract,
    private readonly configService: ConfigService,
  ) {}

  async handle(event: PasswordResetRequestedEvent): Promise<void> {
    this.logger.log(`Password reset requested: credentialAccountId=${event.credentialAccountId}`);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/auth/reset-password?token=${event.token}`;

    try {
      const result = await withRetry(
        () =>
          this.emailProvider.sendPasswordResetEmail(
            event.email,
            resetLink,
            event.email,
            event.lang,
            event.isSocialAccount,
            event.provider,
          ),
        RETRY_OPTIONS,
        this.logger,
        {
          handler: PasswordResetRequestedEventHandler.name,
          event: PasswordResetRequestedEvent.name,
        },
      );

      this.logger.log(`Password reset email sent: emailId=${result.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email after retries: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
