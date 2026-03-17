import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class TenantLimitExceededError extends BusinessLogicException {
  constructor(limitType: string) {
    super(`Tenant limit exceeded: ${limitType}`, 'TENANT_LIMIT_EXCEEDED', [
      { field: limitType, message: `Limit exceeded for ${limitType}` },
    ]);
  }
}
