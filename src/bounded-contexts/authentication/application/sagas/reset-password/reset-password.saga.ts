import { Injectable, Inject, Logger } from '@nestjs/common';
import { Saga, SagaStepConfig } from '@shared/domain/saga';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import {
  ResetPasswordSagaContext,
  ResetPasswordSagaOutput,
} from '@authentication/application/sagas/reset-password/reset-password.saga-context';
import { ok, err, Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import {
  ValidateResetTokenStep,
  HashNewPasswordStep,
  MarkTokenUsedStep,
  ArchiveUserSessionsStep,
  PublishResetPasswordEventsStep,
} from '@authentication/application/sagas/reset-password/steps';

/**
 * ResetPasswordSaga — orchestrates the password reset flow.
 *
 * Transaction phase (ACID — all or nothing):
 *  1. validate-reset-token   → ValidateResetTokenStep   (read token + validate password VO)
 *  2. hash-new-password      → HashNewPasswordStep       (CPU — bcrypt)
 *  3. mark-token-used        → MarkTokenUsedStep         (write: markAsUsed + persist)
 *  4. archive-user-sessions  → ArchiveUserSessionsStep   (write: bulk archive sessions)
 *
 * Steps 3 + 4 are atomic: if session archiving fails, token mark is rolled back.
 *
 * After commit (fire-and-forget):
 *  5. publish-events         → PublishResetPasswordEventsStep
 *       - PasswordResetCompletedEvent (domain, via EventPublisher.commit)
 *       - UserPasswordResetByAuthenticationEvent (integration, via EventBus → User BC)
 */
@Injectable()
export class ResetPasswordSaga extends Saga<ResetPasswordSagaContext> {
  protected readonly processName = 'reset-password';
  protected readonly logger = new Logger(ResetPasswordSaga.name);

  constructor(
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK) uow: IUnitOfWork,
    private readonly validateToken: ValidateResetTokenStep,
    private readonly hashPassword: HashNewPasswordStep,
    private readonly markTokenUsed: MarkTokenUsedStep,
    private readonly archiveSessions: ArchiveUserSessionsStep,
    private readonly publishEvents: PublishResetPasswordEventsStep,
  ) {
    super(uow);
  }

  protected defineSteps(): SagaStepConfig<ResetPasswordSagaContext>[] {
    return [
      { name: 'validate-reset-token', handler: this.validateToken },
      { name: 'hash-new-password', handler: this.hashPassword },
      { name: 'mark-token-used', handler: this.markTokenUsed },
      { name: 'archive-user-sessions', handler: this.archiveSessions },
      { name: 'publish-events', handler: this.publishEvents, transactional: false },
    ];
  }

  async execute(
    input: ResetPasswordSagaContext,
  ): Promise<Result<ResetPasswordSagaOutput, DomainException>> {
    try {
      await this.runWithTimeout(input);
      return ok({ message: 'Password has been reset successfully' });
    } catch (error) {
      if (error instanceof DomainException) return err(error);
      throw error;
    }
  }
}
