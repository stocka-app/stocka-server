import { InvitationAlreadyUsedError } from '@onboarding/domain/errors/invitation-already-used.error';
import { InvitationNotFoundError } from '@onboarding/domain/errors/invitation-not-found.error';
import { OnboardingAlreadyCompletedError } from '@onboarding/domain/errors/onboarding-already-completed.error';
import { OnboardingIncompleteError } from '@onboarding/domain/errors/onboarding-incomplete.error';

describe('Onboarding domain errors', () => {
  describe('InvitationAlreadyUsedError', () => {
    it('should set the correct message and code', () => {
      const error = new InvitationAlreadyUsedError();
      expect(error.message).toBe('Invitation has already been used');
      expect(error.errorCode).toBe('INVITATION_ALREADY_USED');
    });
  });

  describe('InvitationNotFoundError', () => {
    it('should set the correct message and code', () => {
      const error = new InvitationNotFoundError();
      expect(error.message).toBe('Invitation not found or invalid');
      expect(error.errorCode).toBe('INVITATION_NOT_FOUND');
    });
  });

  describe('OnboardingAlreadyCompletedError', () => {
    it('should set the correct message and code', () => {
      const error = new OnboardingAlreadyCompletedError();
      expect(error.message).toBe('Onboarding has already been completed for this user');
      expect(error.errorCode).toBe('ONBOARDING_ALREADY_COMPLETED');
    });
  });

  describe('OnboardingIncompleteError', () => {
    it('should include the missing step in the message', () => {
      const error = new OnboardingIncompleteError('business_info');
      expect(error.message).toContain('business_info');
      expect(error.errorCode).toBe('ONBOARDING_INCOMPLETE');
    });
  });
});
