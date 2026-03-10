import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { EmailVerificationRequestedEvent } from '@auth/domain/events/email-verification-requested.event';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { withRetry, RetryExhaustedException } from '@shared/domain/utils/with-retry';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

const RETRY_OPTIONS = { maxAttempts: 3, backoffMs: 1000 };

@EventsHandler(EmailVerificationRequestedEvent)
export class EmailVerificationRequestedEventHandler implements IEventHandler<EmailVerificationRequestedEvent> {
  private readonly logger = new Logger(EmailVerificationRequestedEventHandler.name);

  constructor(
    @Inject(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
    private readonly emailProvider: IEmailProviderContract,
  ) {}

  async handle(event: EmailVerificationRequestedEvent): Promise<void> {
    this.logger.log(`Email verification requested: userId=${event.userId}`);

    try {
      const result = await withRetry(
        () =>
          this.emailProvider.sendVerificationEmail(
            event.email,
            event.code,
            event.userName,
            event.lang,
          ),
        RETRY_OPTIONS,
        this.logger,
        {
          handler: EmailVerificationRequestedEventHandler.name,
          event: EmailVerificationRequestedEvent.name,
        },
      );

      if (result.success) {
        this.logger.log(`Verification email sent successfully: emailId=${result.id}`);
      } else {
        this.logger.error(`Failed to send verification email: ${result.error}`);
      }
    } catch (error) {
      if (error instanceof RetryExhaustedException) {
        this.logger.error(error.message);
      } else {
        this.logger.error(`Unexpected error sending verification email: ${error}`);
      }
    }
  }
}
