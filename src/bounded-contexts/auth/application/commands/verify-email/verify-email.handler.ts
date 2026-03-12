import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { VerifyEmailCommand } from '@auth/application/commands/verify-email/verify-email.command';
import { VerifyEmailCommandResult } from '@auth/application/types/auth-result.types';
import { IEmailVerificationTokenContract } from '@auth/domain/contracts/email-verification-token.contract';
import { ICodeGeneratorContract } from '@shared/domain/contracts/code-generator.contract';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { InvalidVerificationCodeException } from '@auth/domain/exceptions/invalid-verification-code.exception';
import { VerificationCodeExpiredException } from '@auth/domain/exceptions/verification-code-expired.exception';
import { UserAlreadyVerifiedException } from '@auth/domain/exceptions/user-already-verified.exception';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ok, err } from '@shared/domain/result';

@CommandHandler(VerifyEmailCommand)
export class VerifyEmailHandler implements ICommandHandler<VerifyEmailCommand> {
  private readonly logger = new Logger(VerifyEmailHandler.name);

  constructor(
    private readonly mediator: MediatorService,
    private readonly eventPublisher: EventPublisher,
    @Inject(INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT)
    private readonly tokenContract: IEmailVerificationTokenContract,
    @Inject(INJECTION_TOKENS.CODE_GENERATOR_CONTRACT)
    private readonly codeGenerator: ICodeGeneratorContract,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<VerifyEmailCommandResult> {
    // Find user by email
    const user = await this.mediator.user.findByEmail(command.email);
    if (!user) {
      return err(new InvalidVerificationCodeException());
    }

    // Check if user is already verified
    if (!user.requiresEmailVerification()) {
      return err(new UserAlreadyVerifiedException());
    }

    // Get active verification token
    const token = await this.tokenContract.findActiveByUserId(user.id!);
    if (!token) {
      return err(new InvalidVerificationCodeException());
    }

    // Check if token is expired
    if (token.isExpired()) {
      return err(new VerificationCodeExpiredException());
    }

    // Verify the code
    const codeHash = this.codeGenerator.hashCode(command.code.toUpperCase());
    const isValidCode = token.codeHash === codeHash;

    if (!isValidCode) {
      // Rate limiting and attempt tracking is handled by RateLimitInterceptor
      return err(new InvalidVerificationCodeException());
    }

    // Mark token as used and update user status atomically
    const tokenWithContext = this.eventPublisher.mergeObjectContext(token);
    tokenWithContext.markAsUsed(user.uuid, command.email, command.lang);

    await this.uow.begin();
    try {
      const manager = this.uow.getManager();
      await this.tokenContract.persist(tokenWithContext, manager);
      await this.mediator.user.verifyUserEmail(user.uuid, manager);
      await this.uow.commit();
    } catch (error) {
      await this.uow.rollback();
      this.logger.error(`Verify-email transaction failed: ${error}`);
      throw error;
    }

    // Publish events AFTER commit
    tokenWithContext.commit();

    return ok({
      success: true,
      message: 'Email verified successfully',
    });
  }
}
