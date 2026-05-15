import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidPaymentProviderEventStatusException extends DomainException {
  constructor(value: string) {
    super(
      `Invalid payment provider event status: ${value}`,
      'INVALID_PAYMENT_PROVIDER_EVENT_STATUS',
      [{ field: 'status', message: `Invalid payment provider event status: ${value}` }],
    );
  }
}
