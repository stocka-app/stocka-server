import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidResetToFreeReasonException extends DomainException {
  constructor(value: string) {
    super(`Invalid reset-to-free reason: ${value}`, 'INVALID_RESET_TO_FREE_REASON', [
      { field: 'reason', message: `Invalid reset-to-free reason: ${value}` },
    ]);
  }
}
