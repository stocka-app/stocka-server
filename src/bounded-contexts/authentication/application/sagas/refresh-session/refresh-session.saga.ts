import { Injectable, Inject, Logger } from '@nestjs/common';
import { Saga, SagaStepConfig } from '@shared/domain/saga';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import {
  RefreshSessionSagaContext,
  RefreshSessionSagaOutput,
} from '@authentication/application/sagas/refresh-session/refresh-session.saga-context';
import { ok, err, Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import {
  ValidateRefreshTokenStep,
  ArchiveOldSessionStep,
  GenerateRefreshTokensStep,
  CreateNewSessionStep,
  PublishRefreshEventsStep,
} from '@authentication/application/sagas/refresh-session/steps';

/**
 * RefreshSessionSaga — orchestrates the token rotation flow.
 *
 * Transaction phase (ACID — all or nothing):
 *  1. validate-refresh-token → ValidateRefreshTokenStep  (reads + JWT verify)
 *  2. archive-old-session    → ArchiveOldSessionStep     (soft-delete)
 *  3. generate-new-tokens    → GenerateRefreshTokensStep (CPU — sign JWTs)
 *  4. create-new-session     → CreateNewSessionStep      (persist new session)
 *
 * Steps 2 + 4 are atomic: if session creation fails, archive is rolled back.
 * A client will never lose their session due to a partial failure.
 *
 * After commit (fire-and-forget):
 *  5. publish-events         → PublishRefreshEventsStep  (SessionRefreshedEvent)
 */
@Injectable()
export class RefreshSessionSaga extends Saga<RefreshSessionSagaContext> {
  protected readonly processName = 'refresh-session';
  protected readonly logger = new Logger(RefreshSessionSaga.name);

  constructor(
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK) uow: IUnitOfWork,
    private readonly validateToken: ValidateRefreshTokenStep,
    private readonly archiveOldSession: ArchiveOldSessionStep,
    private readonly generateTokens: GenerateRefreshTokensStep,
    private readonly createNewSession: CreateNewSessionStep,
    private readonly publishEvents: PublishRefreshEventsStep,
  ) {
    super(uow);
  }

  protected defineSteps(): SagaStepConfig<RefreshSessionSagaContext>[] {
    return [
      { name: 'validate-refresh-token', handler: this.validateToken },
      { name: 'archive-old-session', handler: this.archiveOldSession },
      { name: 'generate-new-tokens', handler: this.generateTokens },
      { name: 'create-new-session', handler: this.createNewSession },
      { name: 'publish-events', handler: this.publishEvents, transactional: false },
    ];
  }

  async execute(
    input: RefreshSessionSagaContext,
  ): Promise<Result<RefreshSessionSagaOutput, DomainException>> {
    try {
      const ctx = await this.run(input);

      /* istanbul ignore next */
      if (!ctx.accessToken || !ctx.newRefreshToken) {
        throw new Error('RefreshSessionSaga completed without required output fields');
      }

      return ok({
        accessToken: ctx.accessToken,
        refreshToken: ctx.newRefreshToken,
        username: ctx.username ?? null,
        givenName: ctx.givenName ?? null,
        familyName: ctx.familyName ?? null,
        avatarUrl: ctx.avatarUrl ?? null,
        onboardingStatus: ctx.onboardingStatus ?? null,
      });
    /* istanbul ignore next */
    } catch (error) {
      if (error instanceof DomainException) return err(error);
      throw error;
    }
  }
}
