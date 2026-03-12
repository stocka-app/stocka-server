import { ResendCountVO } from '@authentication/domain/value-objects/resend-count.vo';

describe('ResendCountVO', () => {
  describe('Given a valid non-negative integer', () => {
    it('should create the VO with value 0', () => {
      const vo = new ResendCountVO(0);

      expect(vo.getValue()).toBe(0);
      expect(vo.toString()).toBe('0');
    });

    it('should create the VO with a positive value', () => {
      const vo = new ResendCountVO(5);

      expect(vo.getValue()).toBe(5);
    });
  });

  describe('Given a negative number', () => {
    it('should throw an error', () => {
      expect(() => new ResendCountVO(-1)).toThrow('Resend count cannot be negative');
    });
  });

  describe('Given a non-integer number', () => {
    it('should throw an error', () => {
      expect(() => new ResendCountVO(1.5)).toThrow('Resend count must be an integer');
    });
  });

  describe('increment', () => {
    it('should return a new VO with value incremented by 1', () => {
      const vo = new ResendCountVO(3);
      const incremented = vo.increment();

      expect(incremented.getValue()).toBe(4);
      expect(vo.getValue()).toBe(3); // original unchanged (immutable)
    });
  });

  describe('equals', () => {
    it('should return true for VOs with the same value', () => {
      const vo1 = new ResendCountVO(3);
      const vo2 = new ResendCountVO(3);

      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for VOs with different values', () => {
      const vo1 = new ResendCountVO(3);
      const vo2 = new ResendCountVO(4);

      expect(vo1.equals(vo2)).toBe(false);
    });
  });
});
