import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class TierNotAllowedError extends BusinessLogicException {
  constructor() {
    super('Your current tier does not allow this action', 'TIER_NOT_ALLOWED');
  }
}
