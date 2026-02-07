import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { VerifyEmailCommand } from '@/auth/application/commands/verify-email/verify-email.command';
import { IEmailVerificationTokenContract } from '@/auth/domain/contracts/email-verification-token.contract';
import { IVerificationAttemptContract } from '@/auth/domain/contracts/verification-attempt.contract';
import { ICodeGeneratorContract } from '@/shared/domain/contracts/code-generator.contract';
import { VerificationAttemptModel } from '@/auth/domain/models/verification-attempt.model';
import { InvalidVerificationCodeException } from '@/auth/domain/exceptions/invalid-verification-code.exception';
import { VerificationCodeExpiredException } from '@/auth/domain/exceptions/verification-code-expired.exception';
import { TooManyVerificationAttemptsException } from '@/auth/domain/exceptions/too-many-verification-attempts.exception';
import { VerificationBlockedException } from '@/auth/domain/exceptions/verification-blocked.exception';
import { RateLimitExceededException } from '@/auth/domain/exceptions/rate-limit-exceeded.exception';
import { UserAlreadyVerifiedException } from '@/auth/domain/exceptions/user-already-verified.exception';
import { MediatorService } from '@/shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@/common/constants/app.constants';
import { UserModel } from '@/user/domain/models/user.model';

interface VerifyEmailResult {
  success: boolean;
  message: string;
}

// Blocking thresholds
const BLOCK_THRESHOLDS = {
  WARNING_AT: 3, // Show warning
  BLOCK_5_MIN_AT: 5, // Block for 5 minutes
  BLOCK_30_MIN_AT: 10, // Block for 30 minutes + new code
  BLOCK_24_HOURS_AT: 20, // Block for 24 hours
};

const IP_RATE_LIMIT_PER_HOUR = 20;
const EMAIL_RATE_LIMIT_PER_HOUR = 10;

@CommandHandler(VerifyEmailCommand)
export class VerifyEmailHandler implements ICommandHandler<VerifyEmailCommand> {
  constructor(
    private readonly mediator: MediatorService,
    private readonly eventPublisher: EventPublisher,
    @Inject(INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT)
    private readonly tokenContract: IEmailVerificationTokenContract,
    @Inject(INJECTION_TOKENS.VERIFICATION_ATTEMPT_CONTRACT)
    private readonly attemptContract: IVerificationAttemptContract,
    @Inject(INJECTION_TOKENS.CODE_GENERATOR_CONTRACT)
    private readonly codeGenerator: ICodeGeneratorContract,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<VerifyEmailResult> {
    // Rate limiting checks
    await this.checkRateLimits(command.ipAddress, command.email);

    // Find user by email
    const user = (await this.mediator.findUserByEmail(command.email)) as UserModel | null;
    if (!user) {
      throw new InvalidVerificationCodeException();
    }

    // Check if user is already verified
    if (user.status && !user.status.requiresEmailVerification()) {
      throw new UserAlreadyVerifiedException();
    }

    // Check if user is blocked
    if (user.verificationBlockedUntil && user.verificationBlockedUntil > new Date()) {
      throw new VerificationBlockedException(user.verificationBlockedUntil);
    }

    // Get active verification token
    const token = await this.tokenContract.findActiveByUserId(user.id!);
    if (!token) {
      throw new InvalidVerificationCodeException();
    }

    // Check if token is expired
    if (token.isExpired()) {
      throw new VerificationCodeExpiredException();
    }

    // Count failed attempts
    const failedAttempts = await this.attemptContract.countFailedByUserUuidInLastHour(user.uuid);

    // Check blocking thresholds
    await this.checkBlockingThresholds(user, failedAttempts);

    // Verify the code
    const codeHash = this.codeGenerator.hashCode(command.code.toUpperCase());
    const isValidCode = token.codeHash === codeHash;

    // Record the attempt
    const attempt = isValidCode
      ? VerificationAttemptModel.create({
          userUuid: user.uuid,
          email: command.email,
          ipAddress: command.ipAddress,
          userAgent: command.userAgent,
          codeEntered: command.code,
          success: true,
        })
      : VerificationAttemptModel.createFailed(
          {
            userUuid: user.uuid,
            email: command.email,
            ipAddress: command.ipAddress,
            userAgent: command.userAgent,
            codeEntered: command.code,
          },
          failedAttempts + 1,
        );

    this.eventPublisher.mergeObjectContext(attempt);
    await this.attemptContract.persist(attempt);
    attempt.commit();

    if (!isValidCode) {
      const remainingAttempts = BLOCK_THRESHOLDS.BLOCK_5_MIN_AT - (failedAttempts + 1);
      if (remainingAttempts > 0 && failedAttempts + 1 >= BLOCK_THRESHOLDS.WARNING_AT) {
        throw new TooManyVerificationAttemptsException(remainingAttempts);
      }
      throw new InvalidVerificationCodeException();
    }

    // Mark token as used
    const tokenWithContext = this.eventPublisher.mergeObjectContext(token);
    tokenWithContext.markAsUsed(user.uuid, command.email);
    await this.tokenContract.persist(tokenWithContext);
    tokenWithContext.commit();

    // Update user status to active
    await this.mediator.verifyUserEmail(user.uuid);

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  private async checkRateLimits(ipAddress: string, email: string): Promise<void> {
    const ipAttempts = await this.attemptContract.countFailedByIpAddressInLastHour(ipAddress);
    if (ipAttempts >= IP_RATE_LIMIT_PER_HOUR) {
      throw new RateLimitExceededException('ip');
    }

    const emailAttempts = await this.attemptContract.countFailedByEmailInLastHour(email);
    if (emailAttempts >= EMAIL_RATE_LIMIT_PER_HOUR) {
      throw new RateLimitExceededException('email');
    }
  }

  private async checkBlockingThresholds(user: UserModel, failedAttempts: number): Promise<void> {
    if (failedAttempts >= BLOCK_THRESHOLDS.BLOCK_24_HOURS_AT) {
      const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await this.mediator.blockUserVerification(user.uuid, blockedUntil);
      throw new VerificationBlockedException(blockedUntil);
    }

    if (failedAttempts >= BLOCK_THRESHOLDS.BLOCK_30_MIN_AT) {
      const blockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await this.mediator.blockUserVerification(user.uuid, blockedUntil);
      // Generate new code when blocked at this threshold
      throw new VerificationBlockedException(blockedUntil);
    }

    if (failedAttempts >= BLOCK_THRESHOLDS.BLOCK_5_MIN_AT) {
      const blockedUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await this.mediator.blockUserVerification(user.uuid, blockedUntil);
      throw new VerificationBlockedException(blockedUntil);
    }
  }
}
