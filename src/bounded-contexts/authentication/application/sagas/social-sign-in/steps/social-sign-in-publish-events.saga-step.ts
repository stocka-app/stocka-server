import { Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { ISagaStepHandler } from '@shared/domain/saga';
import { UserSignedInEvent } from '@authentication/domain/events/user-signed-in.event';
import { SocialSignInSagaContext } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga-context';

@Injectable()
export class PublishSocialSignInEventsStep implements ISagaStepHandler<SocialSignInSagaContext> {
  constructor(private readonly eventBus: EventBus) {}

  execute(ctx: SocialSignInSagaContext): Promise<void> {
    if (!ctx.user) throw new Error('PublishSocialSignInEventsStep: ctx.user not set by prior step');

    this.eventBus.publish(new UserSignedInEvent(ctx.user.uuid));
    return Promise.resolve();
  }
}
