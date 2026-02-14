import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class AccountDeactivatedException extends BusinessLogicException {
  constructor() {
    super('Account has been deactivated', 'ACCOUNT_DEACTIVATED', []);
  }
}
