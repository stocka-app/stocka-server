import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidTierChangeDirectionException extends DomainException {
  constructor(value: string) {
    super(`Invalid tier change direction: ${value}`, 'INVALID_TIER_CHANGE_DIRECTION', [
      { field: 'direction', message: `Invalid tier change direction: ${value}` },
    ]);
  }
}
