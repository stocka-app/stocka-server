import { Injectable, Inject } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { ISessionContract } from '@user/account/session/domain/session.contract';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
import { SessionAggregate } from '@user/account/session/domain/session.aggregate';
import { CredentialSessionModel } from '@user/account/session/domain/models/credential-session.model';
import { SignInSagaContext } from '@authentication/application/sagas/sign-in/sign-in.saga-context';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class CreateSignInSessionStep implements ISagaStepHandler<SignInSagaContext> {
  constructor(
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
  ) {}

  async execute(ctx: SignInSagaContext): Promise<void> {
    /* istanbul ignore next */
    if (!ctx.user) throw new Error('CreateSignInSessionStep: ctx.user not set by prior step');
    /* istanbul ignore next */
    if (!ctx.refreshToken)
      throw new Error('CreateSignInSessionStep: ctx.refreshToken not set by prior step');
    /* istanbul ignore next */
    if (!ctx.credential)
      throw new Error('CreateSignInSessionStep: ctx.credential not set by prior step');
    /* istanbul ignore next */
    if (!ctx.credential.id) throw new Error('CreateSignInSessionStep: ctx.credential has no id');

    const tokenHash = AuthenticationDomainService.hashToken(ctx.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = SessionAggregate.create({
      accountId: ctx.credential.accountId,
      tokenHash,
      expiresAt,
    });
    const credentialSession = CredentialSessionModel.create({
      credentialAccountId: ctx.credential.id,
    });
    ctx.session = await this.sessionContract.persistWithCredential(session, credentialSession);
  }
}
