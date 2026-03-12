import { Logger } from '@nestjs/common';
import { ProcessState, ProcessStatus } from '@shared/domain/process-manager/process-state';
import { IProcessStateContract } from '@shared/domain/process-manager/process-state.contract';
import { v7 as uuidv7 } from 'uuid';

/**
 * Abstract ProcessManager base — orchestrates multi-step, cross-BC workflows.
 *
 * Subclasses define steps and compensation logic.
 * State is persisted via IProcessStateContract for crash recovery.
 *
 * @template TData - Shape of the process-specific payload.
 */
export abstract class ProcessManager<TData = Record<string, unknown>> {
  protected abstract readonly processName: string;
  protected abstract readonly logger: Logger;

  constructor(protected readonly stateRepository: IProcessStateContract) {}

  protected async initiate(
    correlationId: string,
    initialStep: string,
    data: TData,
  ): Promise<ProcessState<TData>> {
    const state: ProcessState<TData> = {
      id: uuidv7(),
      processName: this.processName,
      correlationId,
      status: ProcessStatus.STARTED,
      currentStep: initialStep,
      data,
      startedAt: new Date(),
      updatedAt: new Date(),
    };

    return (await this.stateRepository.persist(state as ProcessState)) as ProcessState<TData>;
  }

  protected async transition(
    state: ProcessState<TData>,
    nextStep: string,
    status: ProcessStatus = ProcessStatus.PROCESSING,
    dataUpdate?: Partial<TData>,
  ): Promise<ProcessState<TData>> {
    const updated: ProcessState<TData> = {
      ...state,
      currentStep: nextStep,
      status,
      data: dataUpdate ? { ...state.data, ...dataUpdate } : state.data,
      updatedAt: new Date(),
    };

    return (await this.stateRepository.persist(updated as ProcessState)) as ProcessState<TData>;
  }

  protected async complete(state: ProcessState<TData>): Promise<ProcessState<TData>> {
    const completed: ProcessState<TData> = {
      ...state,
      status: ProcessStatus.COMPLETED,
      completedAt: new Date(),
      updatedAt: new Date(),
    };

    return (await this.stateRepository.persist(completed as ProcessState)) as ProcessState<TData>;
  }

  protected async fail(
    state: ProcessState<TData>,
    errorMessage: string,
  ): Promise<ProcessState<TData>> {
    this.logger.error(
      `Process ${this.processName} [${state.id}] failed at step "${state.currentStep}": ${errorMessage}`,
    );

    const failed: ProcessState<TData> = {
      ...state,
      status: ProcessStatus.FAILED,
      errorMessage,
      updatedAt: new Date(),
    };

    return (await this.stateRepository.persist(failed as ProcessState)) as ProcessState<TData>;
  }

  protected async compensate(
    state: ProcessState<TData>,
    errorMessage: string,
  ): Promise<ProcessState<TData>> {
    this.logger.warn(
      `Process ${this.processName} [${state.id}] entering compensation at step "${state.currentStep}": ${errorMessage}`,
    );

    const compensating: ProcessState<TData> = {
      ...state,
      status: ProcessStatus.COMPENSATING,
      errorMessage,
      updatedAt: new Date(),
    };

    return (await this.stateRepository.persist(
      compensating as ProcessState,
    )) as ProcessState<TData>;
  }

  async findByCorrelationId(correlationId: string): Promise<ProcessState<TData> | null> {
    const state = await this.stateRepository.findByCorrelationId(correlationId);
    return state as ProcessState<TData> | null;
  }
}
