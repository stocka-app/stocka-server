import { Injectable, Inject } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { RefreshSessionSagaContext } from '@authentication/application/sagas/refresh-session/refresh-session.saga-context';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class ArchiveOldSessionStep implements ISagaStepHandler<RefreshSessionSagaContext> {
  constructor(
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
  ) {}

  async execute(ctx: RefreshSessionSagaContext): Promise<void> {
    if (!ctx.oldSessionUUID)
      throw new Error('ArchiveOldSessionStep: ctx.oldSessionUUID not set by prior step');

    await this.sessionContract.archive(ctx.oldSessionUUID);
  }
}
