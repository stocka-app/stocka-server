import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserSignedOutEvent } from '@auth/domain/events/user-signed-out.event';

@EventsHandler(UserSignedOutEvent)
export class UserSignedOutEventHandler implements IEventHandler<UserSignedOutEvent> {
  private readonly logger = new Logger(UserSignedOutEventHandler.name);

  handle(event: UserSignedOutEvent): void {
    this.logger.log(`User signed out: uuid=${event.userUUID}`);
  }
}
