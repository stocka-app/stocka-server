import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordCommand } from '@auth/application/commands/forgot-password/forgot-password.command';
import { ForgotPasswordResult } from '@auth/application/types/auth-result.types';
import { AuthDomainService } from '@auth/domain/services/auth-domain.service';
import { PasswordResetTokenModel } from '@auth/domain/models/password-reset-token.model';
import { IPasswordResetTokenContract } from '@auth/domain/contracts/password-reset-token.contract';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
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
    @Inject(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
    private readonly emailProvider: IEmailProviderContract,
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
      plainToken,
    });

    await this.passwordResetTokenContract.persist(resetToken);

    // Publish events
    this.eventPublisher.mergeObjectContext(resetToken);
    resetToken.commit();

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/auth/reset-password?token=${plainToken}`;

    this.logger.debug(`Password reset token generated for userId=${user.uuid}`);

    // Send password reset email (fire-and-forget: failure should not block the response)
    this.emailProvider
      .sendPasswordResetEmail(command.email, resetLink, command.email, command.lang)
      .then((result) => {
        if (result.success) {
          this.logger.log(`Password reset email sent: emailId=${result.id}`);
        } else {
          this.logger.error(`Failed to send password reset email: ${result.error}`);
        }
      })
      .catch((err: unknown) => {
        this.logger.error(`Error sending password reset email: ${String(err)}`);
      });

    return { message: genericMessage };
  }
}
