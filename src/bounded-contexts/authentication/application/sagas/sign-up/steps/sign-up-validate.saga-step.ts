import { Injectable } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { PasswordVO } from '@authentication/domain/value-objects/password.vo';
import { EmailAlreadyExistsException } from '@authentication/domain/exceptions/email-already-exists.exception';
import { UsernameAlreadyExistsException } from '@authentication/domain/exceptions/username-already-exists.exception';
import { SignUpSagaContext } from '@authentication/application/sagas/sign-up/sign-up.saga-context';

@Injectable()
export class ValidateSignUpStep implements ISagaStepHandler<SignUpSagaContext> {
  constructor(private readonly mediator: MediatorService) {}

  async execute(ctx: SignUpSagaContext): Promise<void> {
    // Validate password format — throws InvalidPasswordException on failure
    new PasswordVO(ctx.password);

    // Check email uniqueness
    const emailExists = await this.mediator.user.existsByEmail(ctx.email);
    if (emailExists) {
      throw new EmailAlreadyExistsException();
    }

    // Check username uniqueness
    const usernameExists = await this.mediator.user.existsByUsername(ctx.username);
    if (usernameExists) {
      throw new UsernameAlreadyExistsException();
    }
  }
}
