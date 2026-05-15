import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidMoneyDecimalFormatException extends DomainException {
  constructor(raw: string) {
    super(`Invalid money decimal format: ${raw}`, 'INVALID_MONEY_DECIMAL_FORMAT', [
      {
        field: 'amount',
        message: `Expected a string with up to 2 decimals (e.g. "199.00"), got "${raw}"`,
      },
    ]);
  }
}
