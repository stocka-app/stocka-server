import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class NoPendingDowngradeException extends BusinessLogicException {
  constructor(subscriptionUUID: string) {
    super(
      `Subscription ${subscriptionUUID} has no pending downgrade to revert`,
      'NO_PENDING_DOWNGRADE',
      [{ field: 'pendingTierChangeUUID', message: 'No active downgrade in cold-down window' }],
    );
  }
}
