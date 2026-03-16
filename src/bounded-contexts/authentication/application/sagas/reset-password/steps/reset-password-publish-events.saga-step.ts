import { Injectable } from '@nestjs/common';
import { EventBus, EventPublisher } from '@nestjs/cqrs';
import { ISagaStepHandler } from '@shared/domain/saga';
import { UserPasswordResetByAuthenticationEvent } from '@shared/domain/events/integration';
import { ResetPasswordSagaContext } from '@authentication/application/sagas/reset-password/reset-password.saga-context';

@Injectable()
export class PublishResetPasswordEventsStep implements ISagaStepHandler<ResetPasswordSagaContext> {
  constructor(
    private readonly eventBus: EventBus,
    private readonly eventPublisher: EventPublisher,
  ) {}

  execute(ctx: ResetPasswordSagaContext): Promise<void> {
    if (!ctx.resetToken)
      throw new Error('PublishResetPasswordEventsStep: ctx.resetToken not set by prior step');
    if (!ctx.newPasswordHash)
      throw new Error('PublishResetPasswordEventsStep: ctx.newPasswordHash not set by prior step');

    // Publish domain events collected on the token aggregate (PasswordResetCompletedEvent)
    this.eventPublisher.mergeObjectContext(ctx.resetToken);
    ctx.resetToken.commit();

    // Publish cross-BC integration event for User BC to update the password hash
    this.eventBus.publish(
      new UserPasswordResetByAuthenticationEvent(ctx.resetToken.credentialAccountId, ctx.newPasswordHash),
    );

    return Promise.resolve();
  }
}
