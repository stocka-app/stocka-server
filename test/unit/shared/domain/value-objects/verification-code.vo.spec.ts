import { VerificationCodeVO } from '@shared/domain/value-objects/compound/verification-code.vo';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

describe('VerificationCodeVO', () => {
  // ─── Construction with valid codes ─────────────────────────────────────────
  describe('Given a valid 6-character code from the allowed charset', () => {
    describe('When constructing the VO', () => {
      it('Then it should accept an uppercase code', () => {
        const vo = new VerificationCodeVO('ABCDEF');
        expect(vo.toString()).toBe('ABCDEF');
      });

      it('Then it should normalize lowercase to uppercase', () => {
        const vo = new VerificationCodeVO('abcdef');
        expect(vo.toString()).toBe('ABCDEF');
      });

      it('Then it should trim whitespace before validation', () => {
        const vo = new VerificationCodeVO('  ABCDEF  ');
        expect(vo.toString()).toBe('ABCDEF');
      });

      it('Then it should accept codes with digits 2-9', () => {
        const vo = new VerificationCodeVO('A2B3C4');
        expect(vo.toString()).toBe('A2B3C4');
      });

      it('Then it should accept a code using the full charset boundary characters', () => {
        const vo = new VerificationCodeVO('Z9XYWV');
        expect(vo.toString()).toBe('Z9XYWV');
      });
    });
  });

  // ─── Construction with invalid codes ───────────────────────────────────────
  describe('Given an invalid code', () => {
    describe('When the code is too short', () => {
      it('Then it should throw a DomainException about length', () => {
        expect(() => new VerificationCodeVO('ABC')).toThrow(DomainException);
        try {
          new VerificationCodeVO('ABC');
        } catch (e) {
          expect((e as DomainException).errorCode).toBe('INVALID_VERIFICATION_CODE');
          expect((e as DomainException).message).toContain('6 characters');
        }
      });
    });

    describe('When the code is too long', () => {
      it('Then it should throw a DomainException about length', () => {
        expect(() => new VerificationCodeVO('ABCDEFG')).toThrow(DomainException);
      });
    });

    describe('When the code is empty', () => {
      it('Then it should throw a DomainException about length', () => {
        expect(() => new VerificationCodeVO('')).toThrow(DomainException);
      });
    });

    describe('When the code contains excluded characters (O, I, L, 0, 1)', () => {
      it('Then it should throw for character O', () => {
        expect(() => new VerificationCodeVO('OABCDE')).toThrow(DomainException);
        try {
          new VerificationCodeVO('OABCDE');
        } catch (e) {
          expect((e as DomainException).message).toContain('Invalid character');
          expect((e as DomainException).message).toContain('O');
        }
      });

      it('Then it should throw for character I', () => {
        expect(() => new VerificationCodeVO('IABCDE')).toThrow(DomainException);
      });

      it('Then it should throw for character L', () => {
        expect(() => new VerificationCodeVO('LABCDE')).toThrow(DomainException);
      });

      it('Then it should throw for digit 0', () => {
        expect(() => new VerificationCodeVO('0ABCDE')).toThrow(DomainException);
      });

      it('Then it should throw for digit 1', () => {
        expect(() => new VerificationCodeVO('1ABCDE')).toThrow(DomainException);
      });
    });

    describe('When the code contains special characters', () => {
      it('Then it should throw a DomainException', () => {
        expect(() => new VerificationCodeVO('ABC!@#')).toThrow(DomainException);
      });
    });

    describe('When the code contains spaces in the middle', () => {
      it('Then it should throw because trimmed result has invalid length or chars', () => {
        expect(() => new VerificationCodeVO('AB CD')).toThrow(DomainException);
      });
    });
  });

  // ─── equals ────────────────────────────────────────────────────────────────
  describe('Given two VerificationCodeVO instances', () => {
    it('Then equals should return true for the same code', () => {
      const a = new VerificationCodeVO('ABCDEF');
      const b = new VerificationCodeVO('ABCDEF');
      expect(a.equals(b)).toBe(true);
    });

    it('Then equals should return true for same code with different casing', () => {
      const a = new VerificationCodeVO('abcdef');
      const b = new VerificationCodeVO('ABCDEF');
      expect(a.equals(b)).toBe(true);
    });

    it('Then equals should return false for different codes', () => {
      const a = new VerificationCodeVO('ABCDEF');
      const b = new VerificationCodeVO('GHJKMN');
      expect(a.equals(b)).toBe(false);
    });

    it('Then equals should return false when compared to a non-VerificationCodeVO', () => {
      const a = new VerificationCodeVO('ABCDEF');
      expect(a.equals(null as unknown as VerificationCodeVO)).toBe(false);
    });

    it('Then equals should return false when compared to a plain object', () => {
      const a = new VerificationCodeVO('ABCDEF');
      expect(a.equals({} as unknown as VerificationCodeVO)).toBe(false);
    });
  });

  // ─── Static accessors ─────────────────────────────────────────────────────
  describe('Given the static accessors', () => {
    it('Then getCharset should return the allowed character set without O, I, L, 0, 1', () => {
      const charset = VerificationCodeVO.getCharset();
      expect(charset).not.toContain('O');
      expect(charset).not.toContain('I');
      expect(charset).not.toContain('L');
      expect(charset).not.toContain('0');
      expect(charset).not.toContain('1');
      expect(charset).toContain('A');
      expect(charset).toContain('9');
      expect(charset.length).toBe(31);
    });

    it('Then getCodeLength should return 6', () => {
      expect(VerificationCodeVO.getCodeLength()).toBe(6);
    });
  });
});
