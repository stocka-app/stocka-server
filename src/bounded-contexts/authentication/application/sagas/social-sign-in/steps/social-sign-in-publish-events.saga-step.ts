import { Injectable } from '@nestjs/common';
import { EventBus, EventPublisher } from '@nestjs/cqrs';
import { ISagaStepHandler } from '@shared/domain/saga';
import { UserSignedInEvent } from '@authentication/domain/events/user-signed-in.event';
import { SocialSignInSagaContext } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga-context';

@Injectable()
export class PublishSocialSignInEventsStep implements ISagaStepHandler<SocialSignInSagaContext> {
  constructor(
    private readonly eventBus: EventBus,
    private readonly eventPublisher: EventPublisher,
  ) {}

  execute(ctx: SocialSignInSagaContext): Promise<void> {
    /* istanbul ignore next */
    if (!ctx.user)
      return Promise.reject(
        new Error('PublishSocialSignInEventsStep: ctx.user not set by prior step'),
      );
    /* istanbul ignore next */
    if (!ctx.session)
      return Promise.reject(
        new Error('PublishSocialSignInEventsStep: ctx.session not set by prior step'),
      );

    // Publish domain events collected on the session aggregate (SessionCreatedEvent)
    this.eventPublisher.mergeObjectContext(ctx.session);
    ctx.session.commit();

    // Publish integration event for analytics / audit
    this.eventBus.publish(new UserSignedInEvent(ctx.user.uuid));

    return Promise.resolve();
  }
}
