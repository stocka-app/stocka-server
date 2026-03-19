import { InvitationAlreadyPendingError } from '@tenant/domain/errors/invitation-already-pending.error';
import { InsufficientPermissionsError } from '@tenant/domain/errors/insufficient-permissions.error';
import { TierNotAllowedError } from '@tenant/domain/errors/tier-not-allowed.error';
import { BusinessLogicException } from '@shared/domain/exceptions/business-logic.exception';

describe('Invitation domain errors', () => {
  describe('Given an InvitationAlreadyPendingError', () => {
    describe('When instantiated', () => {
      it('Then it extends BusinessLogicException with code INVITATION_ALREADY_PENDING', () => {
        const error = new InvitationAlreadyPendingError();
        expect(error).toBeInstanceOf(BusinessLogicException);
        expect(error.errorCode).toBe('INVITATION_ALREADY_PENDING');
        expect(error.message).toBe('A pending invitation already exists for this email');
      });
    });
  });

  describe('Given an InsufficientPermissionsError', () => {
    describe('When instantiated', () => {
      it('Then it extends BusinessLogicException with code INSUFFICIENT_PERMISSIONS', () => {
        const error = new InsufficientPermissionsError();
        expect(error).toBeInstanceOf(BusinessLogicException);
        expect(error.errorCode).toBe('INSUFFICIENT_PERMISSIONS');
        expect(error.message).toBe('You do not have permission to assign this role');
      });
    });
  });

  describe('Given a TierNotAllowedError', () => {
    describe('When instantiated', () => {
      it('Then it extends BusinessLogicException with code TIER_NOT_ALLOWED', () => {
        const error = new TierNotAllowedError();
        expect(error).toBeInstanceOf(BusinessLogicException);
        expect(error.errorCode).toBe('TIER_NOT_ALLOWED');
        expect(error.message).toBe('Your current tier does not allow this action');
      });
    });
  });
});
