import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserSignedUpEvent } from '@auth/domain/events/user-signed-up.event';

@EventsHandler(UserSignedUpEvent)
export class UserSignedUpEventHandler implements IEventHandler<UserSignedUpEvent> {
  private readonly logger = new Logger(UserSignedUpEventHandler.name);

  handle(event: UserSignedUpEvent): void {
    this.logger.log(`User signed up: uuid=${event.userUuid}, email=${event.email}`);
  }
}
