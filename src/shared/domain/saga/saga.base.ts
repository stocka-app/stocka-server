import { ProcessManager } from '@shared/domain/process-manager/process-manager.base';
import { ProcessState, ProcessStatus } from '@shared/domain/process-manager/process-state';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { InMemoryProcessStateContract } from '@shared/infrastructure/process-manager/in-memory-process-state';
import { withRetry } from '@shared/domain/utils/with-retry';
import { v7 as uuidv7 } from 'uuid';
import { SagaStepConfig } from '@shared/domain/saga/saga-step-config.interface';

/**
 * Saga — sequential, request-scoped process orchestrator built on ProcessManager.
 *
 * Defines a business process as ordered steps, each handled by a dedicated
 * ISagaStepHandler. The Saga only orchestrates; handlers contain the logic.
 *
 * Steps execute in their **declared order** — no reordering.
 * Transaction boundaries are managed dynamically:
 *   - A DB transaction opens before the first atomic step in a group.
 *   - It commits when transitioning to a non-atomic step or reaching the end.
 *   - Multiple transaction segments are supported (atomic → non-atomic → atomic).
 *
 * On atomic step failure:
 *   - Active transaction is rolled back.
 *   - ALL previously completed steps (atomic and non-atomic) are compensated in reverse.
 *
 * On non-atomic step failure:
 *   - Only that step is compensated (if it has a compensate method).
 *   - The saga continues (fire-and-forget semantics).
 *
 * Features:
 *   - Per-step retry via withRetry
 *   - Compensation with optional retry (compensationRetry)
 *   - State tracking via ProcessManager (in-memory for request scope)
 *
 * For long-running, event-driven, multi-transaction flows → use ProcessManager directly.
 *
 * @example
 * ```typescript
 * class MySignUpSaga extends Saga<SignUpContext> {
 *   protected defineSteps() {
 *     return [
 *       { name: 'register-user', handler: this.registerUser },
 *       { name: 'create-session', handler: this.createSession },
 *       { name: 'publish-events', handler: this.publishEvents, transactional: false },
 *     ];
 *   }
 * }
 * ```
 */
export abstract class Saga<TCtx = Record<string, unknown>> extends ProcessManager<TCtx> {
  constructor(protected readonly uow: IUnitOfWork) {
    super(new InMemoryProcessStateContract());
  }

  /** Define the ordered steps of this saga. */
  protected abstract defineSteps(): SagaStepConfig<TCtx>[];

  /**
   * Execute the saga: runs steps in declared order, managing transaction
   * boundaries dynamically based on each step's `transactional` flag.
   * Returns the (mutated) context.
   */
  async run(ctx: TCtx): Promise<TCtx> {
    const steps = this.defineSteps();
    const correlationId = uuidv7();
    let state = await this.initiate(correlationId, steps[0]?.name ?? 'init', ctx);
    const processId = state.id;
    const completedSteps: SagaStepConfig<TCtx>[] = [];
    let hasOpenTransaction = false;

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const isTransactional = this.isTransactionalStep(step);

        if (isTransactional && !hasOpenTransaction) {
          await this.uow.begin();
          hasOpenTransaction = true;
        }

        const status = hasOpenTransaction
          ? ProcessStatus.PROCESSING
          : ProcessStatus.POST_PROCESSING;

        state = await this.transition(state, step.name, status);
        this.logger.debug(`[${this.processName}] Executing: ${step.name}`);

        try {
          await this.executeStep(step, ctx);
          completedSteps.push(step);
        } catch (error) {
          if (hasOpenTransaction) {
            await this.uow.rollback();
            hasOpenTransaction = false;
            this.logger.error(
              `[${this.processName}] Failed at "${step.name}" — rolled back: ${(error as Error).message}`,
            );
            await this.runCompensation(state, completedSteps, ctx, (error as Error).message);
            throw error;
          }

          this.logger.warn(
            `[${this.processName}] Side-effect "${step.name}" failed: ${(error as Error).message}`,
          );
          await this.compensateStep(step, ctx);
          continue;
        }

        if (isTransactional && hasOpenTransaction && !this.isTransactionalStep(steps[i + 1])) {
          await this.uow.commit();
          hasOpenTransaction = false;
        }
      }

      await this.complete(state);
      return ctx;
    } finally {
      await this.cleanupProcess(hasOpenTransaction, processId);
    }
  }

  /** Returns true if the step should run inside a DB transaction (default: true). */
  private isTransactionalStep(step?: SagaStepConfig<TCtx>): boolean {
    if (!step) return false;
    return step.transactional !== false;
  }

  /** Safety net: rollback any leaked transaction, then clean up in-memory state. */
  private async cleanupProcess(hasOpenTransaction: boolean, processId: string): Promise<void> {
    if (hasOpenTransaction) {
      try {
        await this.uow.rollback();
      } catch {
        this.logger.error(`Failed to rollback leaked transaction for process ${processId}`);
      }
    }

    await this.stateRepository.delete(processId);
  }

  private async executeStep(step: SagaStepConfig<TCtx>, ctx: TCtx): Promise<void> {
    if (step.retry) {
      await withRetry(() => step.handler.execute(ctx), step.retry, this.logger, {
        handler: this.processName,
        event: step.name,
      });
    } else {
      await step.handler.execute(ctx);
    }
  }

  private async compensateStep(step: SagaStepConfig<TCtx>, ctx: TCtx): Promise<void> {
    const compensateFn = step.handler.compensate;
    if (!compensateFn) return;

    try {
      this.logger.debug(`[${this.processName}] Compensating: ${step.name}`);
      if (step.compensationRetry) {
        await withRetry(() => compensateFn(ctx), step.compensationRetry, this.logger, {
          handler: this.processName,
          event: `compensate:${step.name}`,
        });
      } else {
        await compensateFn(ctx);
      }
    } catch (compError) {
      this.logger.error(
        `[${this.processName}] Compensation failed for "${step.name}": ${(compError as Error).message}`,
      );
    }
  }

  private async runCompensation(
    state: ProcessState<TCtx>,
    completedSteps: SagaStepConfig<TCtx>[],
    ctx: TCtx,
    errorMessage: string,
  ): Promise<void> {
    const stepsToCompensate = [...completedSteps]
      .reverse()
      .filter((s) => s.handler.compensate != null);

    if (stepsToCompensate.length > 0) {
      await this.compensate(state, errorMessage);
      for (const step of stepsToCompensate) {
        await this.compensateStep(step, ctx);
      }
    }

    await this.fail(state, errorMessage);
  }
}
