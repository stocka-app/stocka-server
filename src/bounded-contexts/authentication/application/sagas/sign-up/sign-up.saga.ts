import { Injectable, Inject, Logger } from '@nestjs/common';
import { Saga, SagaStepConfig } from '@shared/domain/saga';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import {
  SignUpSagaContext,
  SignUpSagaOutput,
} from '@authentication/application/sagas/sign-up/sign-up.saga-context';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { ok, err, Result } from '@shared/domain/result';
import {
  ValidateSignUpStep,
  PrepareCredentialsStep,
  RegisterUserStep,
  GenerateTokensStep,
  CreateSessionStep,
  CreateVerificationTokenStep,
  PublishSignUpEventsStep,
  SendVerificationEmailStep,
} from '@authentication/application/sagas/sign-up/steps';

/**
 * SignUpSaga — orchestrates the user registration flow.
 *
 * The saga only declares steps and their configuration.
 * All business logic lives in the individual step handlers.
 *
 * Transaction phase (ACID — all or nothing):
 *  1. validate-sign-up           → ValidateSignUpStep
 *  2. prepare-credentials        → PrepareCredentialsStep
 *  3. register-user              → RegisterUserStep
 *  4. generate-tokens            → GenerateTokensStep
 *  5. create-session             → CreateSessionStep
 *  6. create-verification-token  → CreateVerificationTokenStep
 *
 * After commit (fire-and-forget):
 *  7. publish-events             → PublishSignUpEventsStep (UserSignedUpEvent for analytics)
 *  8. send-verification-email    → SendVerificationEmailStep (direct email with retry)
 */
@Injectable()
export class SignUpSaga extends Saga<SignUpSagaContext> {
  protected readonly processName = 'sign-up';
  protected readonly logger = new Logger(SignUpSaga.name);

  constructor(
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK) uow: IUnitOfWork,
    private readonly validateSignUp: ValidateSignUpStep,
    private readonly prepareCredentials: PrepareCredentialsStep,
    private readonly registerUser: RegisterUserStep,
    private readonly generateTokens: GenerateTokensStep,
    private readonly createSession: CreateSessionStep,
    private readonly createVerification: CreateVerificationTokenStep,
    private readonly publishEvents: PublishSignUpEventsStep,
    private readonly sendVerificationEmail: SendVerificationEmailStep,
  ) {
    super(uow);
  }

  protected defineSteps(): SagaStepConfig<SignUpSagaContext>[] {
    return [
      { name: 'validate-sign-up', handler: this.validateSignUp },
      { name: 'prepare-credentials', handler: this.prepareCredentials },
      { name: 'register-user', handler: this.registerUser },
      { name: 'generate-tokens', handler: this.generateTokens },
      { name: 'create-session', handler: this.createSession },
      { name: 'create-verification-token', handler: this.createVerification },
      { name: 'publish-events', handler: this.publishEvents, transactional: false },
      {
        name: 'send-verification-email',
        handler: this.sendVerificationEmail,
        transactional: false,
        retry: { maxAttempts: 3, backoffMs: 1000 },
      },
    ];
  }

  async execute(input: SignUpSagaContext): Promise<Result<SignUpSagaOutput, DomainException>> {
    try {
      const ctx = await this.run(input);

      /* istanbul ignore next */
      if (!ctx.user || !ctx.credential || !ctx.accessToken || !ctx.refreshToken) {
        throw new Error('Saga completed without required output fields');
      }

      return ok({
        user: ctx.user,
        credential: ctx.credential,
        username: ctx.username,
        accessToken: ctx.accessToken,
        refreshToken: ctx.refreshToken,
        emailSent: ctx.emailSent ?? false,
      });
    /* istanbul ignore next */
    } catch (error) {
      if (error instanceof DomainException) return err(error);
      throw error;
    }
  }
}
