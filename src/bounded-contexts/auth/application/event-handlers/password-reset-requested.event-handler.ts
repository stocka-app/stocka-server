import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { PasswordResetRequestedEvent } from '@auth/domain/events/password-reset-requested.event';

@EventsHandler(PasswordResetRequestedEvent)
export class PasswordResetRequestedEventHandler implements IEventHandler<PasswordResetRequestedEvent> {
  private readonly logger = new Logger(PasswordResetRequestedEventHandler.name);

  handle(event: PasswordResetRequestedEvent): void {
    this.logger.log(`Password reset requested: userId=${event.userId}`);
  }
}
