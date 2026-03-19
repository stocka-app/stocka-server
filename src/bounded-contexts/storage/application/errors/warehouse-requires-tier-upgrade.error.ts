import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class WarehouseRequiresTierUpgradeError extends BusinessLogicException {
  constructor() {
    super(
      'Warehouses are only available on STARTER tier or above. Please upgrade your plan.',
      'WAREHOUSE_REQUIRES_TIER_UPGRADE',
    );
  }
}
