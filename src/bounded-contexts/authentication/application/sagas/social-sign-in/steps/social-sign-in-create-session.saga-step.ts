import { Injectable, Inject } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
import { SessionModel } from '@authentication/domain/models/session.model';
import { SocialSignInSagaContext } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga-context';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class CreateSocialSessionStep implements ISagaStepHandler<SocialSignInSagaContext> {
  constructor(
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
  ) {}

  async execute(ctx: SocialSignInSagaContext): Promise<void> {
    if (!ctx.user) throw new Error('CreateSocialSessionStep: ctx.user not set by prior step');
    if (!ctx.refreshToken)
      throw new Error('CreateSocialSessionStep: ctx.refreshToken not set by prior step');
    if (ctx.accountId === undefined)
      throw new Error('CreateSocialSessionStep: ctx.accountId not set by prior step');

    const tokenHash = AuthenticationDomainService.hashToken(ctx.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = SessionModel.create({
      accountId: ctx.accountId,
      tokenHash,
      expiresAt,
    });

    await this.sessionContract.persist(session);
  }
}
