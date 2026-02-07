import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { SessionRefreshedEvent } from '@/auth/domain/events/session-refreshed.event';

@EventsHandler(SessionRefreshedEvent)
export class SessionRefreshedEventHandler implements IEventHandler<SessionRefreshedEvent> {
  private readonly logger = new Logger(SessionRefreshedEventHandler.name);

  handle(event: SessionRefreshedEvent): void {
    this.logger.log(
      `Session refreshed: oldSessionUuid=${event.oldSessionUuid}, newSessionUuid=${event.newSessionUuid}`,
    );
  }
}
