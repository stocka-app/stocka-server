import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { EmailVerificationCompletedEvent } from '@authentication/domain/events/email-verification-completed.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';

/**
 * User BC handler for EmailVerificationCompletedEvent (cross-BC).
 * When Auth BC completes email verification, this handler marks the
 * credential's email as verified via the user facade.
 */
@EventsHandler(EmailVerificationCompletedEvent)
export class VerifyUserEmailOnVerificationCompletedHandler implements IEventHandler<EmailVerificationCompletedEvent> {
  private readonly logger = new Logger(VerifyUserEmailOnVerificationCompletedHandler.name);

  constructor(private readonly mediator: MediatorService) {}

  async handle(event: EmailVerificationCompletedEvent): Promise<void> {
    const result = await this.mediator.user.findUserByUUIDWithCredential(event.userUUID);
    if (!result) {
      this.logger.warn(`User not found for email verification: uuid=${event.userUUID}`);
      return;
    }

    const credentialId = result.credential.id;
    if (credentialId === undefined || credentialId === null) {
      this.logger.warn(`Credential has no id for email verification: uuid=${event.userUUID}`);
      return;
    }

    try {
      await this.mediator.user.verifyEmail(credentialId);
      this.logger.log(`Email verified via event: uuid=${event.userUUID}`);
    } catch (error) {
      this.logger.warn(
        `Failed to verify email via event: uuid=${event.userUUID}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
