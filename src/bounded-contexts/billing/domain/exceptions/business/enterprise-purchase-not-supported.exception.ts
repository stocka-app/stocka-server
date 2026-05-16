import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class EnterprisePurchaseNotSupportedException extends BusinessLogicException {
  constructor() {
    super(
      'ENTERPRISE tier is not available through self-service purchase; contact sales',
      'ENTERPRISE_PURCHASE_NOT_SUPPORTED',
      [{ field: 'targetTier', message: 'Use admin assignEnterprisePlan after sales contract' }],
    );
  }
}
