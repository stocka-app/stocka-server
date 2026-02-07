import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ResetPasswordCommand } from '@/auth/application/commands/reset-password/reset-password.command';
import { ResetPasswordResult } from '@/auth/application/types/auth-result.types';
import { PasswordVO } from '@/auth/domain/value-objects/password.vo';
import { AuthDomainService } from '@/auth/domain/services/auth-domain.service';
import { IPasswordResetTokenContract } from '@/auth/domain/contracts/password-reset-token.contract';
import { ISessionContract } from '@/auth/domain/contracts/session.contract';
import { TokenExpiredException } from '@/auth/domain/exceptions/token-expired.exception';
import { MediatorService } from '@/shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@/common/constants/app.constants';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand> {
  constructor(
    private readonly mediator: MediatorService,
    private readonly eventPublisher: EventPublisher,
    @Inject(INJECTION_TOKENS.PASSWORD_RESET_TOKEN_CONTRACT)
    private readonly passwordResetTokenContract: IPasswordResetTokenContract,
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<ResetPasswordResult> {
    // Hash the token and find it
    const tokenHash = AuthDomainService.hashToken(command.token);
    const resetToken = await this.passwordResetTokenContract.findByTokenHash(tokenHash);

    // Verify token exists and is valid
    if (!resetToken || !resetToken.isValid()) {
      throw new TokenExpiredException();
    }

    // Validate the new password using domain value object
    new PasswordVO(command.newPassword);

    // Hash the new password and update user
    const newPasswordHash = await AuthDomainService.hashPassword(command.newPassword);
    await this.mediator.updateUserPasswordByUserId(resetToken.userId, newPasswordHash);

    // Mark token as used
    resetToken.markAsUsed();
    await this.passwordResetTokenContract.persist(resetToken);

    // Publish events (PasswordResetCompletedEvent is applied in markAsUsed)
    this.eventPublisher.mergeObjectContext(resetToken);
    resetToken.commit();

    // Archive all sessions for the user
    await this.sessionContract.archiveAllByUserId(resetToken.userId);

    return { message: 'Password has been reset successfully' };
  }
}
