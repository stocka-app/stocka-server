import { Injectable, Inject } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { ISessionContract } from '@user/account/session/domain/session.contract';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
import { SessionAggregate } from '@user/account/session/domain/session.aggregate';
import { RefreshSessionSagaContext } from '@authentication/application/sagas/refresh-session/refresh-session.saga-context';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class CreateNewSessionStep implements ISagaStepHandler<RefreshSessionSagaContext> {
  constructor(
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
  ) {}

  async execute(ctx: RefreshSessionSagaContext): Promise<void> {
    /* istanbul ignore next */
    if (!ctx.user) throw new Error('CreateNewSessionStep: ctx.user not set by prior step');
    /* istanbul ignore next */
    if (!ctx.newRefreshToken)
      throw new Error('CreateNewSessionStep: ctx.newRefreshToken not set by prior step');

    const tokenHash = AuthenticationDomainService.hashToken(ctx.newRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    /* istanbul ignore next */
    if (ctx.accountId === undefined)
      throw new Error('CreateNewSessionStep: ctx.accountId not set by prior step');

    const session = SessionAggregate.create({ accountId: ctx.accountId, tokenHash, expiresAt });
    const persisted = await this.sessionContract.persist(session);
    ctx.newSessionUUID = persisted.uuid;
  }
}
