import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { EmailVerificationCompletedEvent } from '@authentication/domain/events/email-verification-completed.event';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@EventsHandler(EmailVerificationCompletedEvent)
export class EmailVerificationCompletedEventHandler implements IEventHandler<EmailVerificationCompletedEvent> {
  private readonly logger = new Logger(EmailVerificationCompletedEventHandler.name);

  constructor(
    private readonly mediator: MediatorService,
    @Inject(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
    private readonly emailProvider: IEmailProviderContract,
  ) {}

  async handle(event: EmailVerificationCompletedEvent): Promise<void> {
    this.logger.log(`Email verification completed: userUUID=${event.userUUID}`);

    try {
      // Get username for welcome email via profile lookup
      const username = await this.mediator.user.findUsernameByUUID(event.userUUID);
      if (username) {
        const result = await this.emailProvider.sendWelcomeEmail(event.email, username, event.lang);
        this.logger.log(`Welcome email sent successfully: emailId=${result.id}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
