import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { EmailVerificationCompletedEvent } from '@auth/domain/events/email-verification-completed.event';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserModel } from '@user/domain/models/user.model';

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
      // Get user to fetch username for welcome email
      const user = (await this.mediator.findUserByUUID(event.userUUID)) as UserModel | null;
      if (user) {
        const result = await this.emailProvider.sendWelcomeEmail(event.email, user.username, event.lang);
        if (result.success) {
          this.logger.log(`Welcome email sent successfully: emailId=${result.id}`);
        } else {
          this.logger.error(`Failed to send welcome email: ${result.error}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error sending welcome email: ${error}`);
    }
  }
}
