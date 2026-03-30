import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class InvitationExpiredError extends BusinessLogicException {
  constructor() {
    super('Invitation has expired', 'INVITATION_EXPIRED');
  }
}
