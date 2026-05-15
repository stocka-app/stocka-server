import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidBillingCycleException extends DomainException {
  constructor(value: string) {
    super(`Invalid billing cycle: ${value}`, 'INVALID_BILLING_CYCLE', [
      { field: 'billingCycle', message: `Invalid billing cycle: ${value}` },
    ]);
  }
}
