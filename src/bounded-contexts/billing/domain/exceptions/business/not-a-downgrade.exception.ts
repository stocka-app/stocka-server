import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class NotADowngradeException extends BusinessLogicException {
  constructor(currentTier: string, targetTier: string) {
    super(
      `Target tier ${targetTier} is not a downgrade from current tier ${currentTier}`,
      'NOT_A_DOWNGRADE',
      [{ field: 'targetTier', message: `Must be strictly lower than ${currentTier}` }],
    );
  }
}
