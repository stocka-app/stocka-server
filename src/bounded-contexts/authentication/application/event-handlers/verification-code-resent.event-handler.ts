import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { VerificationCodeResentEvent } from '@authentication/domain/events/verification-code-resent.event';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { withRetry } from '@shared/domain/utils/with-retry';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

const RETRY_OPTIONS = { maxAttempts: 3, backoffMs: 1000 };

@EventsHandler(VerificationCodeResentEvent)
export class VerificationCodeResentEventHandler implements IEventHandler<VerificationCodeResentEvent> {
  private readonly logger = new Logger(VerificationCodeResentEventHandler.name);

  constructor(
    @Inject(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
    private readonly emailProvider: IEmailProviderContract,
  ) {}

  async handle(event: VerificationCodeResentEvent): Promise<void> {
    this.logger.log(
      `Verification code resent: credentialAccountId=${event.credentialAccountId}, resendCount=${event.resendCount}`,
    );

    try {
      const result = await withRetry(
        () =>
          this.emailProvider.sendVerificationEmail(event.email, event.code, undefined, event.lang),
        RETRY_OPTIONS,
        this.logger,
        {
          handler: VerificationCodeResentEventHandler.name,
          event: VerificationCodeResentEvent.name,
        },
      );

      this.logger.log(`Verification email resent successfully: emailId=${result.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to resend verification email after retries: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
