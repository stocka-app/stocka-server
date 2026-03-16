import { Injectable, Inject } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
import { SessionModel } from '@authentication/domain/models/session.model';
import { SignInSagaContext } from '@authentication/application/sagas/sign-in/sign-in.saga-context';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class CreateSignInSessionStep implements ISagaStepHandler<SignInSagaContext> {
  constructor(
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
  ) {}

  async execute(ctx: SignInSagaContext): Promise<void> {
    if (!ctx.user) throw new Error('CreateSignInSessionStep: ctx.user not set by prior step');
    if (!ctx.refreshToken)
      throw new Error('CreateSignInSessionStep: ctx.refreshToken not set by prior step');

    const tokenHash = AuthenticationDomainService.hashToken(ctx.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    if (!ctx.credential) throw new Error('CreateSignInSessionStep: ctx.credential not set by prior step');
    const accountId = ctx.credential.accountId;
    const session = SessionModel.create({ accountId, tokenHash, expiresAt });
    ctx.session = await this.sessionContract.persist(session);
  }
}
