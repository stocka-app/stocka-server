import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class NegativeMultiplierException extends BusinessLogicException {
  constructor(factor: number) {
    super(`Negative multiplier not allowed: ${factor}`, 'NEGATIVE_MULTIPLIER', [
      { field: 'factor', message: `Factor must be >= 0, got ${factor}` },
    ]);
  }
}
