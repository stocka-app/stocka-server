import { UserStatusVO, UserStatusEnum } from '@shared/domain/value-objects/compound/user-status.vo';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { VerificationCodeVO } from '@shared/domain/value-objects/compound/verification-code.vo';
import { EmailVO } from '@shared/domain/value-objects/compound/email.vo';
import { ExpiresAtVO } from '@shared/domain/value-objects/compound/expires-at.vo';
import { version as uuidVersion } from 'uuid';

// ─── UserStatusVO ─────────────────────────────────────────────────────────────
describe('UserStatusVO', () => {
  describe('Given a valid status string', () => {
    it('Then it stores the value and isPendingVerification returns true for pending_verification', () => {
      const vo = new UserStatusVO(UserStatusEnum.PENDING_VERIFICATION);
      expect(vo.isPendingVerification()).toBe(true);
      expect(vo.isActive()).toBe(false);
      expect(vo.isArchived()).toBe(false);
      expect(vo.isBlocked()).toBe(false);
    });

    it('Then active() factory creates an active status', () => {
      const vo = UserStatusVO.active();
      expect(vo.isActive()).toBe(true);
      expect(vo.canAccessApplication()).toBe(true);
      expect(vo.requiresEmailVerification()).toBe(false);
    });

    it('Then emailVerifiedByProvider() creates the correct status', () => {
      const vo = UserStatusVO.emailVerifiedByProvider();
      expect(vo.isVerifiedByProvider()).toBe(true);
      expect(vo.canAccessApplication()).toBe(true);
    });

    it('Then archived() creates the correct status', () => {
      const vo = UserStatusVO.archived();
      expect(vo.isArchived()).toBe(true);
      expect(vo.canAccessApplication()).toBe(false);
    });

    it('Then blocked() creates the correct status', () => {
      const vo = UserStatusVO.blocked();
      expect(vo.isBlocked()).toBe(true);
      expect(vo.canAccessApplication()).toBe(false);
    });

    it('Then pendingVerification requires email verification', () => {
      const vo = UserStatusVO.pendingVerification();
      expect(vo.requiresEmailVerification()).toBe(true);
    });
  });

  describe('Given an invalid status string', () => {
    it('Then it throws a DomainException with INVALID_USER_STATUS code', () => {
      expect(() => new UserStatusVO('not_a_status')).toThrow();
    });
  });

  describe('Given two UserStatusVO with the same value', () => {
    it('Then equals returns true', () => {
      const a = UserStatusVO.active();
      const b = UserStatusVO.active();
      expect(a.equals(b)).toBe(true);
    });
  });

  describe('Given two UserStatusVO with different values', () => {
    it('Then equals returns false', () => {
      const a = UserStatusVO.active();
      const b = UserStatusVO.archived();
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('Given a non-UserStatusVO value', () => {
    it('Then equals returns false', () => {
      const vo = UserStatusVO.active();
      expect(vo.equals(null as unknown as UserStatusVO)).toBe(false);
    });
  });

  describe('When toString() is called', () => {
    it('Then it returns the enum string value', () => {
      const vo = UserStatusVO.active();
      expect(vo.toString()).toBe('active');
    });
  });
});

// ─── UUIDVO ───────────────────────────────────────────────────────────────────
describe('UUIDVO', () => {
  describe('Given no value', () => {
    it('Then it auto-generates a valid UUID v7', () => {
      const vo = new UUIDVO();
      const generated = vo.toString();
      expect(generated).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(uuidVersion(generated)).toBe(7);
    });
  });

  describe('Given a valid UUID v7', () => {
    it('Then it stores and returns the UUID', () => {
      const uuid = '550e8400-e29b-71d4-a716-446655440000';
      const vo = new UUIDVO(uuid);
      expect(vo.toString()).toBe(uuid);
    });
  });

  describe('Given an invalid UUID', () => {
    it('Then it throws an INVALID_UUID exception', () => {
      expect(() => new UUIDVO('not-a-uuid')).toThrow();
    });
  });

  describe('Given two UUIDs with the same value', () => {
    it('Then equals returns true', () => {
      const uuid = '550e8400-e29b-71d4-a716-446655440000';
      const a = new UUIDVO(uuid);
      const b = new UUIDVO(uuid);
      expect(a.equals(b)).toBe(true);
    });
  });

  describe('Given two UUIDs with different values', () => {
    it('Then equals returns false', () => {
      const a = new UUIDVO('550e8400-e29b-71d4-a716-446655440000');
      const b = new UUIDVO('660e8400-e29b-71d4-a716-446655440001');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('Given a non-UUIDVO value', () => {
    it('Then equals returns false', () => {
      const a = new UUIDVO('550e8400-e29b-71d4-a716-446655440000');
      expect(a.equals('a-plain-string' as unknown as UUIDVO)).toBe(false);
    });
  });
});

// ─── VerificationCodeVO ───────────────────────────────────────────────────────
describe('VerificationCodeVO', () => {
  describe('Given a valid 6-character code from the allowed charset', () => {
    it('Then it stores the uppercased code', () => {
      const vo = new VerificationCodeVO('ABCD23');
      expect(vo.toString()).toBe('ABCD23');
    });

    it('Then it accepts lowercase input and normalizes to uppercase', () => {
      const vo = new VerificationCodeVO('abcd23');
      expect(vo.toString()).toBe('ABCD23');
    });
  });

  describe('Given a code with invalid length', () => {
    it('Then it throws for a code shorter than 6 characters', () => {
      expect(() => new VerificationCodeVO('AB')).toThrow();
    });

    it('Then it throws for a code longer than 6 characters', () => {
      expect(() => new VerificationCodeVO('ABCDEFG')).toThrow();
    });
  });

  describe('Given a code with excluded characters', () => {
    it('Then it throws for a code containing O (ambiguous character)', () => {
      expect(() => new VerificationCodeVO('ABCOD1')).toThrow();
    });

    it('Then it throws for a code containing I (ambiguous character)', () => {
      expect(() => new VerificationCodeVO('ABCID1')).toThrow();
    });
  });

  describe('When getCharset() is called', () => {
    it('Then it returns the allowed character set', () => {
      expect(VerificationCodeVO.getCharset()).not.toContain('O');
      expect(VerificationCodeVO.getCharset()).not.toContain('I');
      expect(VerificationCodeVO.getCharset()).not.toContain('L');
    });
  });

  describe('When getCodeLength() is called', () => {
    it('Then it returns 6', () => {
      expect(VerificationCodeVO.getCodeLength()).toBe(6);
    });
  });

  describe('Given two VerificationCodeVO with the same value', () => {
    it('Then equals returns true', () => {
      const a = new VerificationCodeVO('ABCD23');
      const b = new VerificationCodeVO('ABCD23');
      expect(a.equals(b)).toBe(true);
    });
  });

  describe('Given a non-VerificationCodeVO value', () => {
    it('Then equals returns false', () => {
      const a = new VerificationCodeVO('ABCD23');
      expect(a.equals(42 as unknown as VerificationCodeVO)).toBe(false);
    });
  });
});

// ─── EmailVO ─────────────────────────────────────────────────────────────────
describe('EmailVO', () => {
  describe('Given a valid email', () => {
    it('Then it normalizes to lowercase', () => {
      const vo = new EmailVO('User@Example.COM');
      expect(vo.toString()).toBe('user@example.com');
    });

    it('Then it trims whitespace', () => {
      const vo = new EmailVO('  user@example.com  ');
      expect(vo.toString()).toBe('user@example.com');
    });
  });

  describe('Given an invalid email format', () => {
    it('Then it throws for a missing @ sign', () => {
      expect(() => new EmailVO('notanemail')).toThrow();
    });

    it('Then it throws for a missing domain', () => {
      expect(() => new EmailVO('user@')).toThrow();
    });
  });

  describe('Given two emails with the same value', () => {
    it('Then equals returns true regardless of original case', () => {
      const a = new EmailVO('User@Test.COM');
      const b = new EmailVO('user@test.com');
      expect(a.equals(b)).toBe(true);
    });
  });

  describe('Given a non-EmailVO value', () => {
    it('Then equals returns false', () => {
      const vo = new EmailVO('user@test.com');
      expect(vo.equals(null as unknown as EmailVO)).toBe(false);
    });
  });
});

// ─── ExpiresAtVO ─────────────────────────────────────────────────────────────
describe('ExpiresAtVO', () => {
  describe('Given a future date', () => {
    it('Then isExpired returns false', () => {
      const future = new Date(Date.now() + 60000);
      const vo = new ExpiresAtVO(future);
      expect(vo.isExpired()).toBe(false);
    });

    it('Then toDate returns a copy of the date', () => {
      const future = new Date(Date.now() + 60000);
      const vo = new ExpiresAtVO(future);
      expect(vo.toDate().getTime()).toBeCloseTo(future.getTime(), -1);
    });
  });

  describe('Given a past date', () => {
    it('Then isExpired returns true', () => {
      const past = new Date(Date.now() - 60000);
      const vo = new ExpiresAtVO(past);
      expect(vo.isExpired()).toBe(true);
    });
  });

  describe('Given an invalid date', () => {
    it('Then it throws an error', () => {
      expect(() => new ExpiresAtVO(new Date('not-a-date'))).toThrow();
    });
  });

  describe('Given two ExpiresAtVO with the same date', () => {
    it('Then equals returns true', () => {
      const date = new Date(Date.now() + 60000);
      const a = new ExpiresAtVO(date);
      const b = new ExpiresAtVO(date);
      expect(a.equals(b)).toBe(true);
    });
  });

  describe('When toString() is called', () => {
    it('Then it returns an ISO string', () => {
      const date = new Date(Date.now() + 60000);
      const vo = new ExpiresAtVO(date);
      expect(vo.toString()).toBe(date.toISOString());
    });
  });

  describe('Given a non-ExpiresAtVO value', () => {
    it('Then equals returns false', () => {
      const vo = new ExpiresAtVO(new Date(Date.now() + 60000));
      expect(vo.equals('not-a-vo' as unknown as ExpiresAtVO)).toBe(false);
    });
  });
});
