import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class SagaTimeoutException extends DomainException {
  constructor(processName: string, timeoutMs: number) {
    super(`Saga "${processName}" exceeded its ${timeoutMs}ms timeout`, 'SAGA_TIMEOUT');
  }
}
