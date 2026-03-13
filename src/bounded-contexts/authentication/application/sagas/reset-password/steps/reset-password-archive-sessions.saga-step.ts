import { Injectable, Inject } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { ResetPasswordSagaContext } from '@authentication/application/sagas/reset-password/reset-password.saga-context';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class ArchiveUserSessionsStep implements ISagaStepHandler<ResetPasswordSagaContext> {
  constructor(
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
  ) {}

  async execute(ctx: ResetPasswordSagaContext): Promise<void> {
    if (!ctx.resetToken)
      throw new Error('ArchiveUserSessionsStep: ctx.resetToken not set by prior step');

    await this.sessionContract.archiveAllByUserId(ctx.resetToken.userId);
  }
}
