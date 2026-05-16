import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class EnterpriseRequiresAdminOperationException extends BusinessLogicException {
  constructor() {
    super(
      'ENTERPRISE tier assignment requires an admin operation; not available via self-service flow',
      'ENTERPRISE_REQUIRES_ADMIN_OPERATION',
      [{ field: 'targetTier', message: 'Contact sales for ENTERPRISE provisioning' }],
    );
  }
}
