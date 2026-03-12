import { Injectable, Inject } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
import { SessionModel } from '@authentication/domain/models/session.model';
import { SignUpSagaContext } from '@authentication/application/sagas/sign-up/sign-up.saga-context';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class CreateSessionStep implements ISagaStepHandler<SignUpSagaContext> {
  constructor(
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
  ) {}

  async execute(ctx: SignUpSagaContext): Promise<void> {
    const user = ctx.user;
    if (!user) throw new Error('CreateSessionStep: ctx.user not set by prior step');
    if (!ctx.refreshToken)
      throw new Error('CreateSessionStep: ctx.refreshToken not set by prior step');

    const tokenHash = AuthenticationDomainService.hashToken(ctx.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = SessionModel.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await this.sessionContract.persist(session);
  }
}
