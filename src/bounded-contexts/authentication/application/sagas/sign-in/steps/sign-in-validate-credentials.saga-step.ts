import { Injectable } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
import { InvalidCredentialsException } from '@authentication/domain/exceptions/invalid-credentials.exception';
import { AccountDeactivatedException } from '@authentication/domain/exceptions/account-deactivated.exception';
import { EmailNotVerifiedException } from '@authentication/domain/exceptions/email-not-verified.exception';
import { SignInSagaContext } from '@authentication/application/sagas/sign-in/sign-in.saga-context';

@Injectable()
export class ValidateCredentialsStep implements ISagaStepHandler<SignInSagaContext> {
  constructor(private readonly mediator: MediatorService) {}

  async execute(ctx: SignInSagaContext): Promise<void> {
    const result = await this.mediator.user.findUserByEmailOrUsername(ctx.emailOrUsername);

    if (!result || !result.credential.hasPassword()) {
      throw new InvalidCredentialsException();
    }

    const { user, credential } = result;

    /* istanbul ignore next */
    const passwordHash = credential.passwordHash ?? '';
    const isPasswordValid = await AuthenticationDomainService.comparePasswords(
      ctx.password,
      passwordHash,
    );

    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    if (user.isArchived()) {
      throw new AccountDeactivatedException();
    }

    if (credential.isPendingVerification()) {
      throw new EmailNotVerifiedException();
    }

    ctx.user = user;
    ctx.credential = credential;
    /* istanbul ignore next */
    ctx.username = (await this.mediator.user.findUsernameByUUID(user.uuid)) ?? credential.email;
  }
}
