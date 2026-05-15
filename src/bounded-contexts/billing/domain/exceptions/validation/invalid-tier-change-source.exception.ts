import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidTierChangeSourceException extends DomainException {
  constructor(value: string) {
    super(`Invalid tier change source: ${value}`, 'INVALID_TIER_CHANGE_SOURCE', [
      { field: 'source', message: `Invalid tier change source: ${value}` },
    ]);
  }
}
