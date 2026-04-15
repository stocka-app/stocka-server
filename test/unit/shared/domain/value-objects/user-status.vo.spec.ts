import {
  InvalidUserStatusException,
  UserStatusVO,
  UserStatusEnum,
} from '@shared/domain/value-objects/compound/user-status.vo';

describe('UserStatusVO', () => {
  // ─── Construction ──────────────────────────────────────────────────────────
  describe('Given a valid user status string', () => {
    describe('When constructing the VO', () => {
      it.each(Object.values(UserStatusEnum))(
        'Then it should accept "%s" without throwing',
        (status) => {
          expect(() => new UserStatusVO(status)).not.toThrow();
        },
      );

      it('Then toString should return the original value', () => {
        const vo = new UserStatusVO(UserStatusEnum.ACTIVE);
        expect(vo.toString()).toBe('active');
      });
    });
  });

  describe('Given an invalid user status string', () => {
    describe('When constructing the VO', () => {
      it('Then it should throw a DomainException with INVALID_USER_STATUS code', () => {
        expect(() => new UserStatusVO('invalid_status')).toThrow(InvalidUserStatusException);
        try {
          new UserStatusVO('nonexistent');
        } catch (e) {
          expect(e).toBeInstanceOf(InvalidUserStatusException);
          expect((e as InvalidUserStatusException).errorCode).toBe('INVALID_USER_STATUS');
          expect((e as InvalidUserStatusException).message).toContain('nonexistent');
          expect((e as InvalidUserStatusException).details).toEqual([
            { field: 'status', message: 'Invalid user status: nonexistent' },
          ]);
        }
      });

      it('Then it should throw for an empty string', () => {
        expect(() => new UserStatusVO('')).toThrow(InvalidUserStatusException);
      });
    });
  });

  // ─── Static factories ──────────────────────────────────────────────────────
  describe('Given the static factory methods', () => {
    it('Then pendingVerification() should create a pending_verification status', () => {
      const vo = UserStatusVO.pendingVerification();
      expect(vo.toString()).toBe('pending_verification');
    });

    it('Then active() should create an active status', () => {
      const vo = UserStatusVO.active();
      expect(vo.toString()).toBe('active');
    });

    it('Then emailVerifiedByProvider() should create an email_verified_by_provider status', () => {
      const vo = UserStatusVO.emailVerifiedByProvider();
      expect(vo.toString()).toBe('email_verified_by_provider');
    });

    it('Then archived() should create an archived status', () => {
      const vo = UserStatusVO.archived();
      expect(vo.toString()).toBe('archived');
    });

    it('Then blocked() should create a blocked status', () => {
      const vo = UserStatusVO.blocked();
      expect(vo.toString()).toBe('blocked');
    });
  });

  // ─── Boolean status checkers ───────────────────────────────────────────────
  describe('Given a pending_verification status', () => {
    const vo = UserStatusVO.pendingVerification();

    it('Then isPendingVerification should return true', () => {
      expect(vo.isPendingVerification()).toBe(true);
    });

    it('Then isActive should return false', () => {
      expect(vo.isActive()).toBe(false);
    });

    it('Then isVerifiedByProvider should return false', () => {
      expect(vo.isVerifiedByProvider()).toBe(false);
    });

    it('Then isArchived should return false', () => {
      expect(vo.isArchived()).toBe(false);
    });

    it('Then isBlocked should return false', () => {
      expect(vo.isBlocked()).toBe(false);
    });
  });

  describe('Given an active status', () => {
    const vo = UserStatusVO.active();

    it('Then isActive should return true', () => {
      expect(vo.isActive()).toBe(true);
    });

    it('Then isPendingVerification should return false', () => {
      expect(vo.isPendingVerification()).toBe(false);
    });
  });

  describe('Given an email_verified_by_provider status', () => {
    const vo = UserStatusVO.emailVerifiedByProvider();

    it('Then isVerifiedByProvider should return true', () => {
      expect(vo.isVerifiedByProvider()).toBe(true);
    });
  });

  describe('Given an archived status', () => {
    const vo = UserStatusVO.archived();

    it('Then isArchived should return true', () => {
      expect(vo.isArchived()).toBe(true);
    });
  });

  describe('Given a blocked status', () => {
    const vo = UserStatusVO.blocked();

    it('Then isBlocked should return true', () => {
      expect(vo.isBlocked()).toBe(true);
    });
  });

  // ─── canAccessApplication ──────────────────────────────────────────────────
  describe('Given the canAccessApplication method', () => {
    it('Then active status should allow access', () => {
      expect(UserStatusVO.active().canAccessApplication()).toBe(true);
    });

    it('Then email_verified_by_provider status should allow access', () => {
      expect(UserStatusVO.emailVerifiedByProvider().canAccessApplication()).toBe(true);
    });

    it('Then pending_verification status should not allow access', () => {
      expect(UserStatusVO.pendingVerification().canAccessApplication()).toBe(false);
    });

    it('Then archived status should not allow access', () => {
      expect(UserStatusVO.archived().canAccessApplication()).toBe(false);
    });

    it('Then blocked status should not allow access', () => {
      expect(UserStatusVO.blocked().canAccessApplication()).toBe(false);
    });
  });

  // ─── requiresEmailVerification ─────────────────────────────────────────────
  describe('Given the requiresEmailVerification method', () => {
    it('Then pending_verification should require email verification', () => {
      expect(UserStatusVO.pendingVerification().requiresEmailVerification()).toBe(true);
    });

    it('Then active should not require email verification', () => {
      expect(UserStatusVO.active().requiresEmailVerification()).toBe(false);
    });

    it('Then blocked should not require email verification', () => {
      expect(UserStatusVO.blocked().requiresEmailVerification()).toBe(false);
    });
  });

  // ─── equals ────────────────────────────────────────────────────────────────
  describe('Given two UserStatusVO instances', () => {
    it('Then equals should return true for the same status', () => {
      const a = UserStatusVO.active();
      const b = UserStatusVO.active();
      expect(a.equals(b)).toBe(true);
    });

    it('Then equals should return false for different statuses', () => {
      const a = UserStatusVO.active();
      const b = UserStatusVO.blocked();
      expect(a.equals(b)).toBe(false);
    });

    it('Then equals should return false when compared to a non-UserStatusVO', () => {
      const a = UserStatusVO.active();
      expect(a.equals(null as unknown as UserStatusVO)).toBe(false);
    });

    it('Then equals should return false when compared to a plain object', () => {
      const a = UserStatusVO.active();
      expect(a.equals({} as unknown as UserStatusVO)).toBe(false);
    });
  });
});
