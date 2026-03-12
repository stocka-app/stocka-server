import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserVerificationBlockedEvent } from '@authentication/domain/events/user-verification-blocked.event';

@EventsHandler(UserVerificationBlockedEvent)
export class UserVerificationBlockedEventHandler implements IEventHandler<UserVerificationBlockedEvent> {
  private readonly logger = new Logger(UserVerificationBlockedEventHandler.name);

  handle(event: UserVerificationBlockedEvent): void {
    this.logger.warn(
      `User verification blocked: userUUID=${event.userUUID}, blockedUntil=${event.blockedUntil.toISOString()}, reason=${event.reason}`,
    );
  }
}
