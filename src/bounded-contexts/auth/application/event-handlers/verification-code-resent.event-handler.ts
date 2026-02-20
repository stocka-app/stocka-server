import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { VerificationCodeResentEvent } from '@auth/domain/events/verification-code-resent.event';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@EventsHandler(VerificationCodeResentEvent)
export class VerificationCodeResentEventHandler implements IEventHandler<VerificationCodeResentEvent> {
  private readonly logger = new Logger(VerificationCodeResentEventHandler.name);

  constructor(
    @Inject(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
    private readonly emailProvider: IEmailProviderContract,
  ) {}

  async handle(event: VerificationCodeResentEvent): Promise<void> {
    this.logger.log(
      `Verification code resent: userId=${event.userId}, resendCount=${event.resendCount}`,
    );

    const result = await this.emailProvider.sendVerificationEmail(
      event.email,
      event.code,
      undefined,
      event.lang,
    );

    if (result.success) {
      this.logger.log(`Verification email resent successfully: emailId=${result.id}`);
    } else {
      this.logger.error(`Failed to resend verification email: ${result.error}`);
    }
  }
}
