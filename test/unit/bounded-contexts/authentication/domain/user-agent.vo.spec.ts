import { UserAgentVO } from '@authentication/domain/value-objects/user-agent.vo';
import { InvalidUserAgentException } from '@authentication/domain/exceptions/invalid-user-agent.exception';

describe('UserAgentVO', () => {
  // ─── Construction with valid user agents ───────────────────────────────────
  describe('Given a valid user agent string', () => {
    describe('When constructing the VO', () => {
      it('Then it should store a typical browser user agent', () => {
        const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        const vo = new UserAgentVO(ua);
        expect(vo.getValue()).toBe(ua);
      });

      it('Then it should trim leading and trailing whitespace', () => {
        const vo = new UserAgentVO('  Mozilla/5.0  ');
        expect(vo.getValue()).toBe('Mozilla/5.0');
      });

      it('Then it should accept a single character', () => {
        const vo = new UserAgentVO('X');
        expect(vo.getValue()).toBe('X');
      });

      it('Then it should accept exactly 512 characters (boundary)', () => {
        const maxUa = 'A'.repeat(512);
        const vo = new UserAgentVO(maxUa);
        expect(vo.getValue()).toBe(maxUa);
        expect(vo.getValue().length).toBe(512);
      });

      it('Then toString should return the user agent string', () => {
        const ua = 'curl/7.68.0';
        const vo = new UserAgentVO(ua);
        expect(vo.toString()).toBe('curl/7.68.0');
      });
    });
  });

  // ─── Construction with invalid user agents ─────────────────────────────────
  describe('Given an invalid user agent string', () => {
    describe('When the string is empty', () => {
      it('Then it should throw InvalidUserAgentException', () => {
        expect(() => new UserAgentVO('')).toThrow(InvalidUserAgentException);
        try {
          new UserAgentVO('');
        } catch (e) {
          expect((e as InvalidUserAgentException).errorCode).toBe('INVALID_USER_AGENT');
          expect((e as InvalidUserAgentException).message).toContain('cannot be empty');
          expect((e as InvalidUserAgentException).details).toEqual([
            { field: 'userAgent', message: 'User agent cannot be empty' },
          ]);
        }
      });
    });

    describe('When the string is only whitespace (trims to empty)', () => {
      it('Then it should throw InvalidUserAgentException', () => {
        expect(() => new UserAgentVO('   ')).toThrow(InvalidUserAgentException);
      });

      it('Then it should throw for tab whitespace', () => {
        expect(() => new UserAgentVO('\t')).toThrow(InvalidUserAgentException);
      });
    });

    describe('When the string exceeds 512 characters', () => {
      it('Then it should throw InvalidUserAgentException', () => {
        const longUa = 'A'.repeat(513);
        expect(() => new UserAgentVO(longUa)).toThrow(InvalidUserAgentException);
        try {
          new UserAgentVO(longUa);
        } catch (e) {
          expect((e as InvalidUserAgentException).message).toContain('512');
        }
      });

      it('Then it should throw for a very long string', () => {
        expect(() => new UserAgentVO('B'.repeat(1000))).toThrow(InvalidUserAgentException);
      });
    });

    describe('When the string would be valid but whitespace padding pushes it over 512 after trim', () => {
      it('Then it should accept if trimmed length is within 512', () => {
        const padded = '  ' + 'A'.repeat(510) + '  ';
        const vo = new UserAgentVO(padded);
        expect(vo.getValue().length).toBe(510);
      });
    });
  });

  // ─── equals (inherited from PrimitiveVO) ───────────────────────────────────
  describe('Given two UserAgentVO instances', () => {
    it('Then equals should return true for the same user agent', () => {
      const ua = 'Mozilla/5.0';
      const a = new UserAgentVO(ua);
      const b = new UserAgentVO(ua);
      expect(a.equals(b)).toBe(true);
    });

    it('Then equals should return false for different user agents', () => {
      const a = new UserAgentVO('Mozilla/5.0');
      const b = new UserAgentVO('curl/7.68.0');
      expect(a.equals(b)).toBe(false);
    });

    it('Then equals should return false when compared to null', () => {
      const a = new UserAgentVO('Mozilla/5.0');
      expect(a.equals(null as unknown as UserAgentVO)).toBe(false);
    });
  });
});
