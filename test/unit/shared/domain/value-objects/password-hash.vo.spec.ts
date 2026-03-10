import { PasswordHashVO } from '@shared/domain/value-objects/primitive/password-hash.vo';

describe('PasswordHashVO', () => {
  describe('Given a valid hash string', () => {
    it('should create the VO successfully', () => {
      const vo = new PasswordHashVO('$2b$10$abcdefghijklmnopqrstuu');

      expect(vo.getValue()).toBe('$2b$10$abcdefghijklmnopqrstuu');
      expect(vo.toString()).toBe('$2b$10$abcdefghijklmnopqrstuu');
    });
  });

  describe('Given an empty string', () => {
    it('should throw an error', () => {
      expect(() => new PasswordHashVO('')).toThrow('Password hash cannot be empty');
    });
  });

  describe('Given a whitespace-only string', () => {
    it('should throw an error', () => {
      expect(() => new PasswordHashVO('   ')).toThrow('Password hash cannot be empty');
    });
  });

  describe('equals', () => {
    it('should return true for VOs with the same value', () => {
      const vo1 = new PasswordHashVO('hash123');
      const vo2 = new PasswordHashVO('hash123');

      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for VOs with different values', () => {
      const vo1 = new PasswordHashVO('hash123');
      const vo2 = new PasswordHashVO('hash456');

      expect(vo1.equals(vo2)).toBe(false);
    });
  });
});
