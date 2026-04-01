import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { VerifyEmailCommand } from '@authentication/application/commands/verify-email/verify-email.command';
import { VerifyEmailCommandResult } from '@authentication/application/types/authentication-result.types';
import { IEmailVerificationTokenContract } from '@authentication/domain/contracts/email-verification-token.contract';
import { ICodeGeneratorContract } from '@shared/domain/contracts/code-generator.contract';
import { InvalidVerificationCodeException } from '@authentication/domain/exceptions/invalid-verification-code.exception';
/* istanbul ignore next */
import { VerificationCodeExpiredException } from '@authentication/domain/exceptions/verification-code-expired.exception';
import { UserAlreadyVerifiedException } from '@authentication/domain/exceptions/user-already-verified.exception';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ok, err } from '@shared/domain/result';

@CommandHandler(VerifyEmailCommand)
export class VerifyEmailHandler implements ICommandHandler<VerifyEmailCommand> {
  constructor(
    private readonly mediator: MediatorService,
    private readonly eventPublisher: EventPublisher,
    @Inject(INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT)
    private readonly tokenContract: IEmailVerificationTokenContract,
    @Inject(INJECTION_TOKENS.CODE_GENERATOR_CONTRACT)
    private readonly codeGenerator: ICodeGeneratorContract,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<VerifyEmailCommandResult> {
    // Find user by email
    const result = await this.mediator.user.findUserByEmail(command.email);
    if (!result) {
      return err(new InvalidVerificationCodeException());
    }

    const { user, credential } = result;

    // Check if user is already verified
    if (!credential.requiresEmailVerification()) {
      return err(new UserAlreadyVerifiedException());
    }

    // Get active verification token
    const credentialId = credential.id;
    /* istanbul ignore next */
    if (credentialId === undefined || credentialId === null) {
      return err(new InvalidVerificationCodeException());
    }

    const token = await this.tokenContract.findActiveByCredentialAccountId(credentialId);

    if (!token) {
      return err(new InvalidVerificationCodeException());
    }

    // Check if token is expired
    /* istanbul ignore next */
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

    // Mark token as used (lang is passed so EmailVerificationCompletedEvent carries locale for welcome email)
    const tokenWithContext = this.eventPublisher.mergeObjectContext(token);
    tokenWithContext.markAsUsed(user.uuid, command.email, command.lang);
    await this.tokenContract.persist(tokenWithContext);
    tokenWithContext.commit();

    // User status update is handled reactively by User BC's
    // VerifyUserEmailOnVerificationCompletedHandler listening to EmailVerificationCompletedEvent

    return ok({
      success: true,
      message: 'Email verified successfully',
    });
  }
}
