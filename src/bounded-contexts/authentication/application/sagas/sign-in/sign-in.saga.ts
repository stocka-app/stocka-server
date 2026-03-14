import { Injectable, Inject, Logger } from '@nestjs/common';
import { Saga, SagaStepConfig } from '@shared/domain/saga';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import {
  SignInSagaContext,
  SignInSagaOutput,
} from '@authentication/application/sagas/sign-in/sign-in.saga-context';
import { ok, err, Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import {
  ValidateCredentialsStep,
  GenerateSignInTokensStep,
  CreateSignInSessionStep,
  PublishSignInEventsStep,
} from '@authentication/application/sagas/sign-in/steps';

/**
 * SignInSaga — orchestrates the credentials-based sign-in flow.
 *
 * Transaction phase (ACID — all or nothing):
 *  1. validate-credentials → ValidateCredentialsStep (read user + password check + guards)
 *  2. generate-tokens      → GenerateSignInTokensStep (CPU — sign JWTs)
 *  3. create-session       → CreateSignInSessionStep  (write: persist session)
 *
 * After commit (fire-and-forget):
 *  4. publish-events       → PublishSignInEventsStep
 *       - SessionCreatedEvent (domain, via EventPublisher.commit on session)
 *       - UserSignedInEvent  (integration, via EventBus)
 */
@Injectable()
export class SignInSaga extends Saga<SignInSagaContext> {
  protected readonly processName = 'sign-in';
  protected readonly logger = new Logger(SignInSaga.name);

  constructor(
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK) uow: IUnitOfWork,
    private readonly validateCredentials: ValidateCredentialsStep,
    private readonly generateTokens: GenerateSignInTokensStep,
    private readonly createSession: CreateSignInSessionStep,
    private readonly publishEvents: PublishSignInEventsStep,
  ) {
    super(uow);
  }

  protected defineSteps(): SagaStepConfig<SignInSagaContext>[] {
    return [
      { name: 'validate-credentials', handler: this.validateCredentials },
      { name: 'generate-tokens', handler: this.generateTokens },
      { name: 'create-session', handler: this.createSession },
      { name: 'publish-events', handler: this.publishEvents, transactional: false },
    ];
  }

  async execute(
    input: SignInSagaContext,
  ): Promise<Result<SignInSagaOutput, DomainException>> {
    try {
      const ctx = await this.run(input);

      if (!ctx.user || !ctx.accessToken || !ctx.refreshToken) {
        throw new Error('SignInSaga completed without required output fields');
      }

      return ok({
        user: ctx.user,
        accessToken: ctx.accessToken,
        refreshToken: ctx.refreshToken,
        emailVerificationRequired: false,
      });
    } catch (error) {
      if (error instanceof DomainException) return err(error);
      throw error;
    }
  }
}
