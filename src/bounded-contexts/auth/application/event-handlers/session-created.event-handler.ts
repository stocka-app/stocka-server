import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { SessionCreatedEvent } from '@/auth/domain/events/session-created.event';

@EventsHandler(SessionCreatedEvent)
export class SessionCreatedEventHandler implements IEventHandler<SessionCreatedEvent> {
  private readonly logger = new Logger(SessionCreatedEventHandler.name);

  handle(event: SessionCreatedEvent): void {
    this.logger.log(`Session created: sessionUuid=${event.sessionUuid}, userId=${event.userId}`);
  }
}
