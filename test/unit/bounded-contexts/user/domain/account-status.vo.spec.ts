import {
  AccountStatusVO,
  AccountStatusEnum,
} from '@user/account/domain/value-objects/account-status.vo';

describe('AccountStatusVO', () => {
  describe('Given an invalid status value', () => {
    describe('When constructing with an unrecognized string', () => {
      it('Then it throws with the invalid value in the message', () => {
        expect(() => new AccountStatusVO('unknown_status')).toThrow(
          'Invalid AccountStatus value: unknown_status',
        );
      });
    });
  });

  describe('Given the pendingVerification factory', () => {
    describe('When creating the VO', () => {
      it('Then isPendingVerification returns true and all others return false', () => {
        const vo = AccountStatusVO.pendingVerification();

        expect(vo.isPendingVerification()).toBe(true);
        expect(vo.isActive()).toBe(false);
        expect(vo.isEmailVerifiedByProvider()).toBe(false);
        expect(vo.isBlocked()).toBe(false);
        expect(vo.isArchived()).toBe(false);
      });

      it('Then requiresEmailVerification returns true', () => {
        expect(AccountStatusVO.pendingVerification().requiresEmailVerification()).toBe(true);
      });

      it('Then canAccessApplication returns false', () => {
        expect(AccountStatusVO.pendingVerification().canAccessApplication()).toBe(false);
      });
    });
  });

  describe('Given the active factory', () => {
    describe('When creating the VO', () => {
      it('Then isActive returns true and all others return false', () => {
        const vo = AccountStatusVO.active();

        expect(vo.isActive()).toBe(true);
        expect(vo.isPendingVerification()).toBe(false);
        expect(vo.isEmailVerifiedByProvider()).toBe(false);
        expect(vo.isBlocked()).toBe(false);
        expect(vo.isArchived()).toBe(false);
      });

      it('Then canAccessApplication returns true', () => {
        expect(AccountStatusVO.active().canAccessApplication()).toBe(true);
      });

      it('Then requiresEmailVerification returns false', () => {
        expect(AccountStatusVO.active().requiresEmailVerification()).toBe(false);
      });
    });
  });

  describe('Given the emailVerifiedByProvider factory', () => {
    describe('When creating the VO', () => {
      it('Then isEmailVerifiedByProvider returns true', () => {
        const vo = AccountStatusVO.emailVerifiedByProvider();

        expect(vo.isEmailVerifiedByProvider()).toBe(true);
        expect(vo.isPendingVerification()).toBe(false);
        expect(vo.isActive()).toBe(false);
        expect(vo.isBlocked()).toBe(false);
        expect(vo.isArchived()).toBe(false);
      });

      it('Then canAccessApplication returns true', () => {
        expect(AccountStatusVO.emailVerifiedByProvider().canAccessApplication()).toBe(true);
      });
    });
  });

  describe('Given the blocked factory', () => {
    describe('When creating the VO', () => {
      it('Then isBlocked returns true', () => {
        const vo = AccountStatusVO.blocked();

        expect(vo.isBlocked()).toBe(true);
        expect(vo.isPendingVerification()).toBe(false);
        expect(vo.isActive()).toBe(false);
        expect(vo.isEmailVerifiedByProvider()).toBe(false);
        expect(vo.isArchived()).toBe(false);
      });

      it('Then canAccessApplication returns false', () => {
        expect(AccountStatusVO.blocked().canAccessApplication()).toBe(false);
      });
    });
  });

  describe('Given the archived factory', () => {
    describe('When creating the VO', () => {
      it('Then isArchived returns true', () => {
        const vo = AccountStatusVO.archived();

        expect(vo.isArchived()).toBe(true);
        expect(vo.isPendingVerification()).toBe(false);
        expect(vo.isActive()).toBe(false);
        expect(vo.isEmailVerifiedByProvider()).toBe(false);
        expect(vo.isBlocked()).toBe(false);
      });

      it('Then canAccessApplication returns false', () => {
        expect(AccountStatusVO.archived().canAccessApplication()).toBe(false);
      });
    });
  });

  describe('Given two AccountStatusVO instances', () => {
    describe('When comparing VOs with the same value', () => {
      it('Then equals returns true', () => {
        const a = AccountStatusVO.active();
        const b = AccountStatusVO.active();

        expect(a.equals(b)).toBe(true);
      });
    });

    describe('When comparing VOs with different values', () => {
      it('Then equals returns false', () => {
        const a = AccountStatusVO.active();
        const b = AccountStatusVO.blocked();

        expect(a.equals(b)).toBe(false);
      });
    });
  });

  describe('Given any AccountStatusVO', () => {
    describe('When calling toString', () => {
      it('Then it returns the raw enum string value', () => {
        expect(AccountStatusVO.active().toString()).toBe(AccountStatusEnum.ACTIVE);
        expect(AccountStatusVO.pendingVerification().toString()).toBe(
          AccountStatusEnum.PENDING_VERIFICATION,
        );
        expect(AccountStatusVO.blocked().toString()).toBe(AccountStatusEnum.BLOCKED);
        expect(AccountStatusVO.archived().toString()).toBe(AccountStatusEnum.ARCHIVED);
        expect(AccountStatusVO.emailVerifiedByProvider().toString()).toBe(
          AccountStatusEnum.EMAIL_VERIFIED_BY_PROVIDER,
        );
      });
    });
  });
});
