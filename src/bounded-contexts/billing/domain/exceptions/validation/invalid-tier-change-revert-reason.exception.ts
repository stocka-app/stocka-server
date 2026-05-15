import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidTierChangeRevertReasonException extends DomainException {
  constructor(value: string) {
    super(`Invalid tier change revert reason: ${value}`, 'INVALID_TIER_CHANGE_REVERT_REASON', [
      { field: 'reason', message: `Invalid tier change revert reason: ${value}` },
    ]);
  }
}
