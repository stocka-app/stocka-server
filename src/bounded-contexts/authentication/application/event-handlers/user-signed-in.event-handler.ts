import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserSignedInEvent } from '@authentication/domain/events/user-signed-in.event';

@EventsHandler(UserSignedInEvent)
export class UserSignedInEventHandler implements IEventHandler<UserSignedInEvent> {
  private readonly logger = new Logger(UserSignedInEventHandler.name);

  handle(event: UserSignedInEvent): void {
    this.logger.log(`User signed in: uuid=${event.userUUID}`);
  }
}
