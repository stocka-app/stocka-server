export enum ProcessStatus {
  STARTED = 'started',
  PROCESSING = 'processing',
  POST_PROCESSING = 'post_processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  COMPENSATING = 'compensating',
}

export interface ProcessState<TData = Record<string, unknown>> {
  id: string;
  processName: string;
  correlationId: string;
  status: ProcessStatus;
  currentStep: string;
  data: TData;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}
