import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { PasswordResetCompletedEvent } from '@auth/domain/events/password-reset-completed.event';

@EventsHandler(PasswordResetCompletedEvent)
export class PasswordResetCompletedEventHandler implements IEventHandler<PasswordResetCompletedEvent> {
  private readonly logger = new Logger(PasswordResetCompletedEventHandler.name);

  handle(event: PasswordResetCompletedEvent): void {
    this.logger.log(`Password reset completed: userId=${event.userId}`);
  }
}
