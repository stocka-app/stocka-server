import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class InvitationAlreadyPendingError extends BusinessLogicException {
  constructor() {
    super('A pending invitation already exists for this email', 'INVITATION_ALREADY_PENDING');
  }
}
