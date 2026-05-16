import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class NotAnUpgradeException extends BusinessLogicException {
  constructor(currentTier: string, targetTier: string) {
    super(
      `Target tier ${targetTier} is not an upgrade from current tier ${currentTier}`,
      'NOT_AN_UPGRADE',
      [{ field: 'targetTier', message: `Must be strictly higher than ${currentTier}` }],
    );
  }
}
