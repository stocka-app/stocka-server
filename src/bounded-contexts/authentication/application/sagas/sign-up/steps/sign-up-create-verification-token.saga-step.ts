import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISagaStepHandler } from '@shared/domain/saga';
import { IEmailVerificationTokenContract } from '@authentication/domain/contracts/email-verification-token.contract';
import { ICodeGeneratorContract } from '@shared/domain/contracts/code-generator.contract';
import { EmailVerificationTokenAggregate } from '@authentication/domain/aggregates/email-verification-token.aggregate';
import { SignUpSagaContext } from '@authentication/application/sagas/sign-up/sign-up.saga-context';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class CreateVerificationTokenStep implements ISagaStepHandler<SignUpSagaContext> {
  constructor(
    @Inject(INJECTION_TOKENS.CODE_GENERATOR_CONTRACT)
    private readonly codeGenerator: ICodeGeneratorContract,
    @Inject(INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT)
    private readonly verificationTokenContract: IEmailVerificationTokenContract,
    private readonly configService: ConfigService,
  ) {}

  async execute(ctx: SignUpSagaContext): Promise<void> {
    /* istanbul ignore next */
    if (!ctx.credential)
      throw new Error('CreateVerificationTokenStep: ctx.credential not set by prior step');
    /* istanbul ignore next */
    if (!ctx.verificationCode)
      throw new Error('CreateVerificationTokenStep: ctx.verificationCode not set by prior step');

    const codeHash = this.codeGenerator.hashCode(ctx.verificationCode);
    const expirationMinutes = this.configService.get<number>(
      'VERIFICATION_CODE_EXPIRATION_MINUTES',
      10,
    );
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    const credentialId = ctx.credential.id;
    /* istanbul ignore next */
    if (credentialId === undefined)
      throw new Error('CreateVerificationTokenStep: ctx.credential has no id');

    const token = EmailVerificationTokenAggregate.create({
      credentialAccountId: credentialId,
      codeHash,
      expiresAt,
      email: ctx.credential.email,
      code: ctx.verificationCode,
    });

    await this.verificationTokenContract.persist(token);
  }
}
