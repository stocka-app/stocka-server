import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { SessionArchivedEvent } from '@/auth/domain/events/session-archived.event';

@EventsHandler(SessionArchivedEvent)
export class SessionArchivedEventHandler implements IEventHandler<SessionArchivedEvent> {
  private readonly logger = new Logger(SessionArchivedEventHandler.name);

  handle(event: SessionArchivedEvent): void {
    this.logger.log(`Session archived: sessionUuid=${event.sessionUuid}`);
  }
}
