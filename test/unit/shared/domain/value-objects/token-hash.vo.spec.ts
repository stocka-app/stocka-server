import { TokenHashVO } from '@shared/domain/value-objects/primitive/token-hash.vo';

describe('TokenHashVO', () => {
  describe('Given a valid hash string', () => {
    it('should create the VO successfully', () => {
      const vo = new TokenHashVO('abc123hash');

      expect(vo.getValue()).toBe('abc123hash');
      expect(vo.toString()).toBe('abc123hash');
    });
  });

  describe('Given an empty string', () => {
    it('should throw an error', () => {
      expect(() => new TokenHashVO('')).toThrow('Token hash cannot be empty');
    });
  });

  describe('Given a whitespace-only string', () => {
    it('should throw an error', () => {
      expect(() => new TokenHashVO('   ')).toThrow('Token hash cannot be empty');
    });
  });

  describe('equals', () => {
    it('should return true for VOs with the same value', () => {
      const vo1 = new TokenHashVO('hash123');
      const vo2 = new TokenHashVO('hash123');

      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for VOs with different values', () => {
      const vo1 = new TokenHashVO('hash123');
      const vo2 = new TokenHashVO('hash456');

      expect(vo1.equals(vo2)).toBe(false);
    });
  });
});
