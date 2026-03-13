import { Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { ISagaStepHandler } from '@shared/domain/saga';
import { SessionRefreshedEvent } from '@authentication/domain/events/session-refreshed.event';
import { RefreshSessionSagaContext } from '@authentication/application/sagas/refresh-session/refresh-session.saga-context';

@Injectable()
export class PublishRefreshEventsStep implements ISagaStepHandler<RefreshSessionSagaContext> {
  constructor(private readonly eventBus: EventBus) {}

  execute(ctx: RefreshSessionSagaContext): Promise<void> {
    if (!ctx.oldSessionUUID)
      throw new Error('PublishRefreshEventsStep: ctx.oldSessionUUID not set by prior step');
    if (!ctx.newSessionUUID)
      throw new Error('PublishRefreshEventsStep: ctx.newSessionUUID not set by prior step');

    this.eventBus.publish(new SessionRefreshedEvent(ctx.oldSessionUUID, ctx.newSessionUUID));
    return Promise.resolve();
  }
}
