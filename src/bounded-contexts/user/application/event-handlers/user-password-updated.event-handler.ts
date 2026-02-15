import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserPasswordUpdatedEvent } from '@user/domain/events/user-password-updated.event';

@EventsHandler(UserPasswordUpdatedEvent)
export class UserPasswordUpdatedEventHandler implements IEventHandler<UserPasswordUpdatedEvent> {
  private readonly logger = new Logger(UserPasswordUpdatedEventHandler.name);

  handle(event: UserPasswordUpdatedEvent): void {
    this.logger.log(`User password updated: uuid=${event.userUUID}`);
  }
}
