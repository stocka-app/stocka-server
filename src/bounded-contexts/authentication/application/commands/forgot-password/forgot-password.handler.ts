import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { ForgotPasswordCommand } from '@authentication/application/commands/forgot-password/forgot-password.command';
import { ForgotPasswordResult } from '@authentication/application/types/authentication-result.types';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
import { PasswordResetTokenModel } from '@authentication/domain/models/password-reset-token.model';
import { IPasswordResetTokenContract } from '@authentication/domain/contracts/password-reset-token.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

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

    const result = await this.mediator.user.findUserByEmail(command.email);

    if (!result) {
      return { message: genericMessage };
    }

    const { user, credential } = result;

    const plainToken = AuthenticationDomainService.generateRandomToken();
    const tokenHash = AuthenticationDomainService.hashToken(plainToken);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const isSocialAccount = !credential.hasPassword();

    const credentialId = credential.id;
    /* istanbul ignore next */
    if (credentialId === undefined || credentialId === null) {
      return { message: genericMessage };
    }

    const resetToken = PasswordResetTokenModel.create({
      credentialAccountId: credentialId,
      tokenHash,
      expiresAt,
      email: command.email,
      plainToken,
      lang: command.lang,
      isSocialAccount,
      provider: isSocialAccount ? credential.createdWith : null,
    });

    await this.passwordResetTokenContract.persist(resetToken);

    this.eventPublisher.mergeObjectContext(resetToken);
    resetToken.commit();

    this.logger.debug(`Password reset token generated for userId=${user.uuid}`);

    return { message: genericMessage };
  }
}
