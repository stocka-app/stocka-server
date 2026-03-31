import { Injectable, Inject } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { IPasswordResetTokenContract } from '@authentication/domain/contracts/password-reset-token.contract';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
/* istanbul ignore next */
import { PasswordVO } from '@authentication/domain/value-objects/password.vo';
import { TokenExpiredException } from '@authentication/domain/exceptions/token-expired.exception';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { ResetPasswordSagaContext } from '@authentication/application/sagas/reset-password/reset-password.saga-context';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class ValidateResetTokenStep implements ISagaStepHandler<ResetPasswordSagaContext> {
  constructor(
    @Inject(INJECTION_TOKENS.PASSWORD_RESET_TOKEN_CONTRACT)
    private readonly passwordResetTokenContract: IPasswordResetTokenContract,
  ) {}

  async execute(ctx: ResetPasswordSagaContext): Promise<void> {
    const tokenHash = AuthenticationDomainService.hashToken(ctx.token);
    const resetToken = await this.passwordResetTokenContract.findByTokenHash(tokenHash);

    if (!resetToken || !resetToken.isValid()) {
      throw new TokenExpiredException();
    }

    // Validate new password up-front — fail fast before any writes
    try {
      new PasswordVO(ctx.newPassword);
    } catch (e) {
      /* istanbul ignore next */
      if (e instanceof DomainException) throw e;
      /* istanbul ignore next */
      throw e;
    }

    ctx.resetToken = resetToken;
  }
}
