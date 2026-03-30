import { ISagaStepHandler } from '@shared/domain/saga/saga-step-handler.contract';
import { RetryOptions } from '@shared/domain/utils/with-retry';

/**
 * Configuration for a step within a Saga flow.
 */
export interface SagaStepConfig<TCtx> {
  /** Unique name for this step (used in logs and state tracking). */
  readonly name: string;
  /** The handler that contains the business logic. */
  readonly handler: ISagaStepHandler<TCtx>;
  /** Optional retry policy for this step. */
  readonly retry?: RetryOptions;
  /** Optional retry policy for compensation of this step. */
  readonly compensationRetry?: RetryOptions;
  /**
   * Whether this step runs inside the DB transaction.
   * Default: true. Set to false for side-effect steps (events, external calls).
   */
  readonly transactional?: boolean;
}
