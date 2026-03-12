import { ProcessState } from '@shared/domain/process-manager/process-state';

export interface IProcessStateContract {
  findById(id: string): Promise<ProcessState | null>;
  findByCorrelationId(correlationId: string): Promise<ProcessState | null>;
  persist(state: ProcessState): Promise<ProcessState>;
  delete(id: string): Promise<void>;
}
