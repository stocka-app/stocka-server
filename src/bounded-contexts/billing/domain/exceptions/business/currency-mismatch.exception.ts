import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class CurrencyMismatchException extends BusinessLogicException {
  constructor(left: string, right: string) {
    super(`Currency mismatch in arithmetic operation: ${left} vs ${right}`, 'CURRENCY_MISMATCH', [
      { field: 'currency', message: `Cannot operate across ${left} and ${right}` },
    ]);
  }
}
