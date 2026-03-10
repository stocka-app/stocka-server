import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { EmailVerificationFailedEvent } from '@auth/domain/events/email-verification-failed.event';

@EventsHandler(EmailVerificationFailedEvent)
export class EmailVerificationFailedEventHandler implements IEventHandler<EmailVerificationFailedEvent> {
  private readonly logger = new Logger(EmailVerificationFailedEventHandler.name);

  handle(event: EmailVerificationFailedEvent): void {
    this.logger.warn(
      `Email verification failed: userUUID=${event.userUUID}, ipAddress=${event.ipAddress}, failedAttempts=${event.failedAttempts}`,
    );

    const isSuspiciousActivity = event.failedAttempts >= 5;
    if (isSuspiciousActivity) {
      this.logger.warn(
        `Suspicious verification activity detected: userUUID=${event.userUUID}, ` +
          `failedAttempts=${event.failedAttempts}, ipAddress=${event.ipAddress}`,
      );
    }
  }
}
