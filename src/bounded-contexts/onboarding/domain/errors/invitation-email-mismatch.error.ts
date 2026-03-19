import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

export class InvitationEmailMismatchError extends BusinessLogicException {
  constructor() {
    super(
      'Your email does not match the invitation. Please sign in with the invited email address.',
      'INVITATION_EMAIL_MISMATCH',
    );
  }
}
