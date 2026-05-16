import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class PendingTierChangeAlreadyExistsException extends BusinessLogicException {
  constructor(subscriptionUUID: string, pendingTierChangeUUID: string) {
    super(
      `Subscription ${subscriptionUUID} already has a pending tier change (${pendingTierChangeUUID})`,
      'PENDING_TIER_CHANGE_ALREADY_EXISTS',
      [
        {
          field: 'pendingTierChangeUUID',
          message: `Revert or wait for ${pendingTierChangeUUID} to complete before requesting another change`,
        },
      ],
    );
  }
}
