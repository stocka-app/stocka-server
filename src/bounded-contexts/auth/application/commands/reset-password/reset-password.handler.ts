import { CommandHandler, ICommandHandler, EventPublisher, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ResetPasswordCommand } from '@auth/application/commands/reset-password/reset-password.command';
import { ResetPasswordCommandResult } from '@auth/application/types/auth-result.types';
import { PasswordVO } from '@auth/domain/value-objects/password.vo';
import { AuthDomainService } from '@auth/domain/services/auth-domain.service';
import { IPasswordResetTokenContract } from '@auth/domain/contracts/password-reset-token.contract';
import { ISessionContract } from '@auth/domain/contracts/session.contract';
import { TokenExpiredException } from '@auth/domain/exceptions/token-expired.exception';
import { UserPasswordResetByAuthEvent } from '@shared/domain/events/integration';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { ok, err } from '@shared/domain/result';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand> {
  constructor(
    private readonly eventPublisher: EventPublisher,
    private readonly eventBus: EventBus,
    @Inject(INJECTION_TOKENS.PASSWORD_RESET_TOKEN_CONTRACT)
    private readonly passwordResetTokenContract: IPasswordResetTokenContract,
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<ResetPasswordCommandResult> {
    // Hash the token and find it
    const tokenHash = AuthDomainService.hashToken(command.token);
    const resetToken = await this.passwordResetTokenContract.findByTokenHash(tokenHash);

    // Verify token exists and is valid
    if (!resetToken || !resetToken.isValid()) {
      return err(new TokenExpiredException());
    }

    // Validate the new password using domain value object
    try {
      new PasswordVO(command.newPassword);
    } catch (e) {
      if (e instanceof DomainException) return err(e);
      throw e;
    }

    // Hash the new password and publish event for User BC to handle
    const newPasswordHash = await AuthDomainService.hashPassword(command.newPassword);
    this.eventBus.publish(new UserPasswordResetByAuthEvent(resetToken.userId, newPasswordHash));

    // Mark token as used
    resetToken.markAsUsed();
    await this.passwordResetTokenContract.persist(resetToken);

    // Publish events (PasswordResetCompletedEvent is applied in markAsUsed)
    this.eventPublisher.mergeObjectContext(resetToken);
    resetToken.commit();

    // Archive all sessions for the user
    await this.sessionContract.archiveAllByUserId(resetToken.userId);

    return ok({ message: 'Password has been reset successfully' });
  }
}
