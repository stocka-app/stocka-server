import { Injectable, Inject } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { ISessionContract } from '@user/account/session/domain/session.contract';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
import { SessionAggregate } from '@user/account/session/domain/session.aggregate';
import { CredentialSessionModel } from '@user/account/session/domain/models/credential-session.model';
import { SignUpSagaContext } from '@authentication/application/sagas/sign-up/sign-up.saga-context';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class CreateSessionStep implements ISagaStepHandler<SignUpSagaContext> {
  constructor(
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
  ) {}

  async execute(ctx: SignUpSagaContext): Promise<void> {
    /* istanbul ignore next */
    if (!ctx.user) throw new Error('CreateSessionStep: ctx.user not set by prior step');
    /* istanbul ignore next */
    if (!ctx.credential) throw new Error('CreateSessionStep: ctx.credential not set by prior step');
    /* istanbul ignore next */
    if (!ctx.refreshToken)
      throw new Error('CreateSessionStep: ctx.refreshToken not set by prior step');
    /* istanbul ignore next */
    if (!ctx.credential.id) throw new Error('CreateSessionStep: ctx.credential has no id');

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

    await this.sessionContract.persistWithCredential(session, credentialSession);
  }
}
