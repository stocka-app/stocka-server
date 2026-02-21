import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
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
    private readonly eventPublisher: EventPublisher,
    @Inject(INJECTION_TOKENS.PASSWORD_RESET_TOKEN_CONTRACT)
    private readonly passwordResetTokenContract: IPasswordResetTokenContract,
  ) {}

  async execute(command: ForgotPasswordCommand): Promise<ForgotPasswordResult> {
    const genericMessage = 'If an account exists, a reset link has been sent';

    const user = (await this.mediator.findUserByEmail(command.email)) as UserModel | null;

    if (!user) {
      return { message: genericMessage };
    }

    const plainToken = AuthDomainService.generateRandomToken();
    const tokenHash = AuthDomainService.hashToken(plainToken);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const isSocialAccount = !user.hasPassword();

    const resetToken = PasswordResetTokenModel.create({
      userId: user.id!,
      tokenHash,
      expiresAt,
      email: command.email,
      plainToken,
      lang: command.lang,
      isSocialAccount,
      provider: isSocialAccount ? user.createdWith : null,
    });

    await this.passwordResetTokenContract.persist(resetToken);

    this.eventPublisher.mergeObjectContext(resetToken);
    resetToken.commit();

    this.logger.debug(`Password reset token generated for userId=${user.uuid}`);

    return { message: genericMessage };
  }
}
