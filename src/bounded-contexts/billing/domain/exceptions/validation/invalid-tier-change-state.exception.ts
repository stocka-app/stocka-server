import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidTierChangeStateException extends DomainException {
  constructor(value: string) {
    super(`Invalid tier change state: ${value}`, 'INVALID_TIER_CHANGE_STATE', [
      { field: 'state', message: `Invalid tier change state: ${value}` },
    ]);
  }
}
