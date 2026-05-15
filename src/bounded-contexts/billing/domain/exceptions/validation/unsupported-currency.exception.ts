import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class UnsupportedCurrencyException extends DomainException {
  constructor(currency: string) {
    super(`Unsupported currency: ${currency}`, 'UNSUPPORTED_CURRENCY', [
      { field: 'currency', message: `Currency "${currency}" is not in the supported set` },
    ]);
  }
}
