import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResendVerificationCodeCommand } from '@auth/application/commands/resend-verification-code/resend-verification-code.command';
import { ResendVerificationCodeCommandResult } from '@auth/application/types/auth-result.types';
import { EmailVerificationTokenModel } from '@auth/domain/models/email-verification-token.model';
import { IEmailVerificationTokenContract } from '@auth/domain/contracts/email-verification-token.contract';
import { ICodeGeneratorContract } from '@shared/domain/contracts/code-generator.contract';
import { ResendCooldownActiveException } from '@auth/domain/exceptions/resend-cooldown-active.exception';
import { MaxResendsExceededException } from '@auth/domain/exceptions/max-resends-exceeded.exception';
import { UserAlreadyVerifiedException } from '@auth/domain/exceptions/user-already-verified.exception';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserModel } from '@user/domain/models/user.model';
import { ok, err } from '@shared/domain/result';

@CommandHandler(ResendVerificationCodeCommand)
export class ResendVerificationCodeHandler implements ICommandHandler<ResendVerificationCodeCommand> {
  constructor(
    private readonly mediator: MediatorService,
    private readonly configService: ConfigService,
    private readonly eventPublisher: EventPublisher,
    @Inject(INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT)
    private readonly tokenContract: IEmailVerificationTokenContract,
    @Inject(INJECTION_TOKENS.CODE_GENERATOR_CONTRACT)
    private readonly codeGenerator: ICodeGeneratorContract,
  ) {}

  async execute(command: ResendVerificationCodeCommand): Promise<ResendVerificationCodeCommandResult> {
    // Find user by email
    const user = (await this.mediator.findUserByEmail(command.email)) as UserModel | null;
    if (!user) {
      // Return success to prevent email enumeration
      return ok({
        success: true,
        message: 'If your email exists, a new code has been sent.',
      });
    }

    // Check if user is already verified
    if (user.status && !user.status.requiresEmailVerification()) {
      return err(new UserAlreadyVerifiedException());
    }

    // Get existing token
    const existingToken = await this.tokenContract.findActiveByUserId(user.id!);

    if (existingToken) {
      // Check cooldown
      if (!existingToken.canResend()) {
        const secondsRemaining = existingToken.getSecondsUntilCanResend();
        if (secondsRemaining > 0) {
          return err(new ResendCooldownActiveException(secondsRemaining));
        }

        // Check max resends
        if (existingToken.getRemainingResends() <= 0) {
          return err(new MaxResendsExceededException());
        }
      }

      // Generate new code
      const newCode = this.codeGenerator.generateVerificationCode();
      const newCodeHash = this.codeGenerator.hashCode(newCode);
      const expirationMinutes = this.configService.get<number>(
        'VERIFICATION_CODE_EXPIRATION_MINUTES',
        10,
      );
      const newExpiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

      // Update the token
      // updateCode() emits VerificationCodeResentEvent — el event handler envía el correo
      const tokenWithContext = this.eventPublisher.mergeObjectContext(existingToken);
      tokenWithContext.updateCode(newCodeHash, newExpiresAt, command.email, newCode, command.lang);
      await this.tokenContract.persist(tokenWithContext);
      tokenWithContext.commit();

      return ok({
        success: true,
        message: 'Verification code resent successfully.',
        cooldownSeconds: existingToken.getCurrentCooldownSeconds(),
        remainingResends: existingToken.getRemainingResends() - 1,
      });
    }

    // No existing token — crear uno nuevo via createForResend()
    // createForResend() emite VerificationCodeResentEvent (no EmailVerificationRequestedEvent)
    // para que el VerificationCodeResentEventHandler sea el único responsable del correo
    const code = this.codeGenerator.generateVerificationCode();
    const codeHash = this.codeGenerator.hashCode(code);
    const expirationMinutes = this.configService.get<number>(
      'VERIFICATION_CODE_EXPIRATION_MINUTES',
      10,
    );
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    const token = EmailVerificationTokenModel.createForResend({
      userId: user.id!,
      codeHash,
      expiresAt,
      email: command.email,
      code,
      lang: command.lang,
    });

    const tokenWithContext = this.eventPublisher.mergeObjectContext(token);
    await this.tokenContract.persist(tokenWithContext);
    tokenWithContext.commit();

    return ok({
      success: true,
      message: 'Verification code sent successfully.',
      cooldownSeconds: 0,
      remainingResends: token.getRemainingResends(),
    });
  }
}
