import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordCommand } from '@auth/application/commands/forgot-password/forgot-password.command';
import { ForgotPasswordResult } from '@auth/application/types/auth-result.types';
import { AuthDomainService } from '@auth/domain/services/auth-domain.service';
import { PasswordResetTokenModel } from '@auth/domain/models/password-reset-token.model';
import { IPasswordResetTokenContract } from '@auth/domain/contracts/password-reset-token.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserModel } from '@user/domain/models/user.model';

@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler implements ICommandHandler<ForgotPasswordCommand> {
  private readonly logger = new Logger(ForgotPasswordHandler.name);

  constructor(
    private readonly mediator: MediatorService,
    private readonly configService: ConfigService,
    private readonly eventPublisher: EventPublisher,
    @Inject(INJECTION_TOKENS.PASSWORD_RESET_TOKEN_CONTRACT)
    private readonly passwordResetTokenContract: IPasswordResetTokenContract,
  ) {}

  async execute(command: ForgotPasswordCommand): Promise<ForgotPasswordResult> {
    // Always return the same message to not reveal if email exists
    const genericMessage = 'If an account exists, a reset link has been sent';

    // Try to find user by email
    const user = (await this.mediator.findUserByEmail(command.email)) as UserModel | null;

    if (!user) {
      // Don't reveal that the user doesn't exist
      return { message: genericMessage };
    }

    // Generate a random token
    const plainToken = AuthDomainService.generateRandomToken();
    const tokenHash = AuthDomainService.hashToken(plainToken);

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Create and persist the password reset token
    const resetToken = PasswordResetTokenModel.create({
      userId: user.id!,
      tokenHash,
      expiresAt,
      email: command.email,
    });

    await this.passwordResetTokenContract.persist(resetToken);

    // Publish events
    this.eventPublisher.mergeObjectContext(resetToken);
    resetToken.commit();

    // NOSONAR: Email sending will be implemented in the Notifications bounded context (see architecture/01-bounded-contexts/notifications/)
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/auth/reset-password?token=${plainToken}`;

    // Log the reset link for development
    this.logger.log(`Password reset link generated for ${command.email}: ${resetLink}`);

    return { message: genericMessage };
  }
}
