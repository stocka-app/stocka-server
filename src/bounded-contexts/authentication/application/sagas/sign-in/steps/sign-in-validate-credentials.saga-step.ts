import { Injectable } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
import { InvalidCredentialsException } from '@authentication/domain/exceptions/invalid-credentials.exception';
import { AccountDeactivatedException } from '@authentication/domain/exceptions/account-deactivated.exception';
import { EmailNotVerifiedException } from '@authentication/domain/exceptions/email-not-verified.exception';
import { SocialAccountRequiredException } from '@authentication/domain/exceptions/social-account-required.exception';
import { SignInSagaContext } from '@authentication/application/sagas/sign-in/sign-in.saga-context';

@Injectable()
export class ValidateCredentialsStep implements ISagaStepHandler<SignInSagaContext> {
  constructor(private readonly mediator: MediatorService) {}

  async execute(ctx: SignInSagaContext): Promise<void> {
    const user = await this.mediator.user.findByEmailOrUsername(ctx.emailOrUsername);

    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await AuthenticationDomainService.comparePasswords(
      ctx.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    if (user.isArchived()) {
      throw new AccountDeactivatedException();
    }

    if (user.isFlexiblePending()) {
      throw new SocialAccountRequiredException();
    }

    if (user.isPendingVerification()) {
      throw new EmailNotVerifiedException();
    }

    ctx.user = user;
  }
}
