import { CodeHashVO } from '@shared/domain/value-objects/primitive/code-hash.vo';

describe('CodeHashVO', () => {
  describe('Given a valid hash string', () => {
    it('should create the VO successfully', () => {
      const vo = new CodeHashVO('codehash123');

      expect(vo.getValue()).toBe('codehash123');
      expect(vo.toString()).toBe('codehash123');
    });
  });

  describe('Given an empty string', () => {
    it('should throw an error', () => {
      expect(() => new CodeHashVO('')).toThrow('Code hash cannot be empty');
    });
  });

  describe('Given a whitespace-only string', () => {
    it('should throw an error', () => {
      expect(() => new CodeHashVO('   ')).toThrow('Code hash cannot be empty');
    });
  });

  describe('equals', () => {
    it('should return true for VOs with the same value', () => {
      const vo1 = new CodeHashVO('hash123');
      const vo2 = new CodeHashVO('hash123');

      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for VOs with different values', () => {
      const vo1 = new CodeHashVO('hash123');
      const vo2 = new CodeHashVO('hash456');

      expect(vo1.equals(vo2)).toBe(false);
    });
  });
});
