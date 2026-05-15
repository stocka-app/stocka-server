import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidMoneyAmountException extends DomainException {
  constructor(amount: string) {
    super(`Invalid money amount: ${amount}`, 'INVALID_MONEY_AMOUNT', [
      { field: 'amount', message: `Amount must be non-negative, got ${amount}` },
    ]);
  }
}
