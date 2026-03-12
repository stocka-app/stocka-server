import { Injectable } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { SignUpSagaContext } from '@authentication/application/sagas/sign-up/sign-up.saga-context';

@Injectable()
export class RegisterUserStep implements ISagaStepHandler<SignUpSagaContext> {
  constructor(private readonly mediator: MediatorService) {}

  async execute(ctx: SignUpSagaContext): Promise<void> {
    if (!ctx.passwordHash)
      throw new Error('RegisterUserStep: ctx.passwordHash not set by prior step');

    ctx.user = await this.mediator.user.createUser(ctx.email, ctx.username, ctx.passwordHash);
  }

  compensate(_ctx: SignUpSagaContext): Promise<void> {
    // No compensation needed for user registration step
    return Promise.resolve();
  }
}
