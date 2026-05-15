import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidBillingModeException extends DomainException {
  constructor(value: string) {
    super(`Invalid billing mode: ${value}`, 'INVALID_BILLING_MODE', [
      { field: 'billingMode', message: `Invalid billing mode: ${value}` },
    ]);
  }
}
