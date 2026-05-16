import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class UpgradeNotInProgressException extends BusinessLogicException {
  constructor(subscriptionUUID: string, currentStatus: string) {
    super(
      `Subscription ${subscriptionUUID} has no upgrade in progress (current status: ${currentStatus})`,
      'UPGRADE_NOT_IN_PROGRESS',
      [
        {
          field: 'status',
          message: `commitUpgrade requires INCOMPLETE status, found ${currentStatus}`,
        },
      ],
    );
  }
}
