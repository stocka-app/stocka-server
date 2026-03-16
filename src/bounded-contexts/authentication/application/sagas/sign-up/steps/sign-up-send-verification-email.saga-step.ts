import { Injectable, Inject, Logger } from '@nestjs/common';
import { ISagaStepHandler } from '@shared/domain/saga';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { SignUpSagaContext } from '@authentication/application/sagas/sign-up/sign-up.saga-context';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@Injectable()
export class SendVerificationEmailStep implements ISagaStepHandler<SignUpSagaContext> {
  private readonly logger = new Logger(SendVerificationEmailStep.name);

  constructor(
    @Inject(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
    private readonly emailProvider: IEmailProviderContract,
  ) {}

  async execute(ctx: SignUpSagaContext): Promise<void> {
    const user = ctx.user;
    if (!user) throw new Error('SendVerificationEmailStep: ctx.user not set by prior step');
    if (!ctx.credential) throw new Error('SendVerificationEmailStep: ctx.credential not set by prior step');
    if (!ctx.verificationCode)
      throw new Error('SendVerificationEmailStep: ctx.verificationCode not set by prior step');

    const result = await this.emailProvider.sendVerificationEmail(
      ctx.credential.email,
      ctx.verificationCode,
      ctx.username, // from ctx input — set before saga starts
      ctx.lang,
    );

    ctx.emailSent = true;
    this.logger.log(`Verification email sent: emailId=${result.id}, to=${ctx.credential.email}`);
  }
}
