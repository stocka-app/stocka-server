import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidPaymentProviderCodeException extends DomainException {
  constructor(value: string) {
    super(`Invalid payment provider code: ${value}`, 'INVALID_PAYMENT_PROVIDER_CODE', [
      { field: 'providerCode', message: `Invalid payment provider code: ${value}` },
    ]);
  }
}
