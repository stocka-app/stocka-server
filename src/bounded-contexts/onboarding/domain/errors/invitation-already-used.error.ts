import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class InvitationAlreadyUsedError extends BusinessLogicException {
  constructor() {
    super('Invitation has already been used', 'INVITATION_ALREADY_USED');
  }
}
