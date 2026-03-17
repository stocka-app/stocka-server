import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class CannotRemoveLastOwnerError extends BusinessLogicException {
  constructor() {
    super('Cannot remove the last owner of the tenant', 'CANNOT_REMOVE_LAST_OWNER');
  }
}
