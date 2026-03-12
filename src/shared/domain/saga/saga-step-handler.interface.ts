/**
 * Handler for an individual saga step.
 * Implement execute() with the step's business logic.
 * Optionally implement compensate() for rollback beyond DB (external calls, etc.).
 */
export interface ISagaStepHandler<TCtx = unknown> {
  execute(ctx: TCtx): Promise<void>;
  compensate?(ctx: TCtx): Promise<void>;
}
