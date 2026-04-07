import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class WarehouseRequiresTierUpgradeError extends BusinessLogicException {
  constructor() {
    super(
      'Your current plan does not allow creating warehouses. Please upgrade your plan.',
      'WAREHOUSE_REQUIRES_TIER_UPGRADE',
    );
  }
}
