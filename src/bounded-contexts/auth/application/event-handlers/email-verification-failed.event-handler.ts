import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { EmailVerificationFailedEvent } from '@auth/domain/events/email-verification-failed.event';

@EventsHandler(EmailVerificationFailedEvent)
export class EmailVerificationFailedEventHandler implements IEventHandler<EmailVerificationFailedEvent> {
  private readonly logger = new Logger(EmailVerificationFailedEventHandler.name);

  handle(event: EmailVerificationFailedEvent): void {
    this.logger.warn(
      `Email verification failed: userUuid=${event.userUuid}, email=${event.email}, ` +
        `ipAddress=${event.ipAddress}, failedAttempts=${event.failedAttempts}`,
    );

    // Log additional warning for suspicious activity
    if (event.failedAttempts >= 5) {
      this.logger.warn(
        `Suspicious verification activity detected: userUuid=${event.userUuid}, ` +
          `failedAttempts=${event.failedAttempts}, ipAddress=${event.ipAddress}`,
      );
    }
  }
}
