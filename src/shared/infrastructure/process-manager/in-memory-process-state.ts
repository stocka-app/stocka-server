import { ProcessState } from '@shared/domain/process-manager/process-state';
import { IProcessStateContract } from '@shared/domain/process-manager/process-state.contract';

/**
 * In-memory process state storage for request-scoped saga flows.
 * State exists only during the saga run — no crash recovery.
 * For persistent state (long-running flows), use a TypeORM implementation.
 */
export class InMemoryProcessStateContract implements IProcessStateContract {
  private readonly states = new Map<string, ProcessState>();

  findById(id: string): Promise<ProcessState | null> {
    return Promise.resolve(this.states.get(id) ?? null);
  }

  findByCorrelationId(correlationId: string): Promise<ProcessState | null> {
    for (const state of this.states.values()) {
      if (state.correlationId === correlationId) return Promise.resolve(state);
    }
    return Promise.resolve(null);
  }

  persist(state: ProcessState): Promise<ProcessState> {
    this.states.set(state.id, state);
    return Promise.resolve(state);
  }

  delete(id: string): Promise<void> {
    this.states.delete(id);
    return Promise.resolve();
  }
}
