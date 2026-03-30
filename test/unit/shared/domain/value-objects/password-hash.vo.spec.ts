import { PasswordHashVO } from '@shared/domain/value-objects/primitive/password-hash.vo';

describe('PasswordHashVO', () => {
  // ─── Construction with valid hashes ────────────────────────────────────────
  describe('Given a valid non-empty hash string', () => {
    describe('When constructing the VO', () => {
      it('Then it should store the hash value', () => {
        const hash = '$2b$10$abcdefghijklmnopqrstuvwxyz123456789ABCDEFGHIJKLMNOPQRS';
        const vo = new PasswordHashVO(hash);
        expect(vo.getValue()).toBe(hash);
      });

      it('Then toString should return the hash string', () => {
        const hash = '$argon2id$v=19$m=65536,t=3,p=4$hash';
        const vo = new PasswordHashVO(hash);
        expect(vo.toString()).toBe(hash);
      });

      it('Then it should accept a single character hash', () => {
        const vo = new PasswordHashVO('x');
        expect(vo.getValue()).toBe('x');
      });
    });
  });

  // ─── Construction with invalid hashes ──────────────────────────────────────
  describe('Given an invalid hash string', () => {
    describe('When the hash is empty', () => {
      it('Then it should throw an Error', () => {
        expect(() => new PasswordHashVO('')).toThrow('Password hash cannot be empty');
      });
    });

    describe('When the hash is only whitespace', () => {
      it('Then it should throw an Error', () => {
        expect(() => new PasswordHashVO('   ')).toThrow('Password hash cannot be empty');
      });

      it('Then it should throw for tab characters', () => {
        expect(() => new PasswordHashVO('\t\t')).toThrow('Password hash cannot be empty');
      });
    });
  });

  // ─── equals (inherited from PrimitiveVO) ───────────────────────────────────
  describe('Given two PasswordHashVO instances', () => {
    it('Then equals should return true for the same hash', () => {
      const hash = '$2b$10$somehashedvalue';
      const a = new PasswordHashVO(hash);
      const b = new PasswordHashVO(hash);
      expect(a.equals(b)).toBe(true);
    });

    it('Then equals should return false for different hashes', () => {
      const a = new PasswordHashVO('hash1');
      const b = new PasswordHashVO('hash2');
      expect(a.equals(b)).toBe(false);
    });

    it('Then equals should return false when compared to a non-PrimitiveVO', () => {
      const a = new PasswordHashVO('hash1');
      expect(a.equals(null as unknown as PasswordHashVO)).toBe(false);
    });
  });
});
