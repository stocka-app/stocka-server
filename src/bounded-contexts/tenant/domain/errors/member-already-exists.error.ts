import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class MemberAlreadyExistsError extends BusinessLogicException {
  constructor() {
    super('Member already exists in this tenant', 'MEMBER_ALREADY_EXISTS');
  }
}
