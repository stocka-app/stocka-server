import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserCreatedFromSocialEvent } from '@user/domain/events/user-created-from-social.event';

@EventsHandler(UserCreatedFromSocialEvent)
export class UserCreatedFromSocialEventHandler implements IEventHandler<UserCreatedFromSocialEvent> {
  private readonly logger = new Logger(UserCreatedFromSocialEventHandler.name);

  handle(event: UserCreatedFromSocialEvent): void {
    this.logger.log(
      `User created from social: uuid=${event.userUuid}, email=${event.email}, provider=${event.provider}`,
    );
  }
}
