import { OnboardingAlreadyCompletedError } from '@tenant/domain/errors/onboarding-already-completed.error';
import { TenantNotFoundError } from '@tenant/domain/errors/tenant-not-found.error';
import { MemberNotFoundError } from '@tenant/domain/errors/member-not-found.error';
import { MemberAlreadyExistsError } from '@tenant/domain/errors/member-already-exists.error';
import { CannotRemoveLastOwnerError } from '@tenant/domain/errors/cannot-remove-last-owner.error';
import { TenantLimitExceededError } from '@tenant/domain/errors/tenant-limit-exceeded.error';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

describe('Tenant Domain Errors', () => {
  describe('Given OnboardingAlreadyCompletedError', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code and message', () => {
        const error = new OnboardingAlreadyCompletedError();
        expect(error).toBeInstanceOf(DomainException);
        expect(error.errorCode).toBe('ONBOARDING_ALREADY_COMPLETED');
        expect(error.message).toBe('Onboarding has already been completed for this user');
      });
    });
  });

  describe('Given TenantNotFoundError', () => {
    describe('When instantiated with an identifier', () => {
      it('Then it has the correct error code and includes the identifier', () => {
        const error = new TenantNotFoundError('some-uuid');
        expect(error).toBeInstanceOf(DomainException);
        expect(error.errorCode).toBe('TENANT_NOT_FOUND');
        expect(error.message).toContain('some-uuid');
      });
    });
  });

  describe('Given MemberNotFoundError', () => {
    describe('When instantiated with an identifier', () => {
      it('Then it has the correct error code and includes the identifier', () => {
        const error = new MemberNotFoundError('user-42');
        expect(error).toBeInstanceOf(DomainException);
        expect(error.errorCode).toBe('MEMBER_NOT_FOUND');
        expect(error.message).toContain('user-42');
      });
    });
  });

  describe('Given MemberAlreadyExistsError', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code', () => {
        const error = new MemberAlreadyExistsError();
        expect(error).toBeInstanceOf(DomainException);
        expect(error.errorCode).toBe('MEMBER_ALREADY_EXISTS');
      });
    });
  });

  describe('Given CannotRemoveLastOwnerError', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code', () => {
        const error = new CannotRemoveLastOwnerError();
        expect(error).toBeInstanceOf(DomainException);
        expect(error.errorCode).toBe('CANNOT_REMOVE_LAST_OWNER');
      });
    });
  });

  describe('Given TenantLimitExceededError', () => {
    describe('When instantiated with a limit type', () => {
      it('Then it has the correct error code and details', () => {
        const error = new TenantLimitExceededError('maxUsers');
        expect(error).toBeInstanceOf(DomainException);
        expect(error.errorCode).toBe('TENANT_LIMIT_EXCEEDED');
        expect(error.message).toContain('maxUsers');
        expect(error.details).toHaveLength(1);
        expect(error.details[0].field).toBe('maxUsers');
      });
    });
  });
});
