import { Injectable } from '@nestjs/common';
import { EventBus, EventPublisher } from '@nestjs/cqrs';
import { ISagaStepHandler } from '@shared/domain/saga';
import { UserSignedInEvent } from '@authentication/domain/events/user-signed-in.event';
import { SignInSagaContext } from '@authentication/application/sagas/sign-in/sign-in.saga-context';

@Injectable()
export class PublishSignInEventsStep implements ISagaStepHandler<SignInSagaContext> {
  constructor(
    private readonly eventBus: EventBus,
    private readonly eventPublisher: EventPublisher,
  ) {}

  execute(ctx: SignInSagaContext): Promise<void> {
    if (!ctx.user)
      throw new Error('PublishSignInEventsStep: ctx.user not set by prior step');
    if (!ctx.session)
      throw new Error('PublishSignInEventsStep: ctx.session not set by prior step');

    // Publish domain events collected on the session aggregate (SessionCreatedEvent)
    this.eventPublisher.mergeObjectContext(ctx.session);
    ctx.session.commit();

    // Publish integration event for analytics / audit
    this.eventBus.publish(new UserSignedInEvent(ctx.user.uuid));

    return Promise.resolve();
  }
}
