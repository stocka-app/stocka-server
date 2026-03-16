import { Injectable, Inject } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { IPasswordResetTokenContract } from '@authentication/domain/contracts/password-reset-token.contract';
import { ResetPasswordSagaContext } from '@authentication/application/sagas/reset-password/reset-password.saga-context';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class MarkTokenUsedStep implements ISagaStepHandler<ResetPasswordSagaContext> {
  constructor(
    @Inject(INJECTION_TOKENS.PASSWORD_RESET_TOKEN_CONTRACT)
    private readonly passwordResetTokenContract: IPasswordResetTokenContract,
  ) {}

  async execute(ctx: ResetPasswordSagaContext): Promise<void> {
    if (!ctx.resetToken) throw new Error('MarkTokenUsedStep: ctx.resetToken not set by prior step');

    ctx.resetToken.markAsUsed();
    await this.passwordResetTokenContract.persist(ctx.resetToken);
  }
}
