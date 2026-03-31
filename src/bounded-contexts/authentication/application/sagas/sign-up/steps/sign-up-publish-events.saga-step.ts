import { Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { ISagaStepHandler } from '@shared/domain/saga';
import { UserSignedUpEvent } from '@authentication/domain/events/user-signed-up.event';
import { SignUpSagaContext } from '@authentication/application/sagas/sign-up/sign-up.saga-context';

@Injectable()
export class PublishSignUpEventsStep implements ISagaStepHandler<SignUpSagaContext> {
  constructor(private readonly eventBus: EventBus) {}

  execute(ctx: SignUpSagaContext): Promise<void> {
    const user = ctx.user;
    /* istanbul ignore next */
    if (!user)
      return Promise.reject(new Error('PublishSignUpEventsStep: ctx.user not set by prior step'));
    /* istanbul ignore next */
    if (!ctx.credential)
      return Promise.reject(
        new Error('PublishSignUpEventsStep: ctx.credential not set by prior step'),
      );

    this.eventBus.publish(new UserSignedUpEvent(user.uuid, ctx.credential.email));
    return Promise.resolve();
  }
}
