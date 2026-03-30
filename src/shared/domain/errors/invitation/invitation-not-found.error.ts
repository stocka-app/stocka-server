import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class InvitationNotFoundError extends BusinessLogicException {
  constructor() {
    super('Invitation not found or invalid', 'INVITATION_NOT_FOUND');
  }
}
