import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class InsufficientPermissionsError extends BusinessLogicException {
  constructor() {
    super('You do not have permission to assign this role', 'INSUFFICIENT_PERMISSIONS');
  }
}
