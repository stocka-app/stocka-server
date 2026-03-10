import { UsedAtVO } from '@auth/domain/value-objects/used-at.vo';

describe('UsedAtVO', () => {
  describe('Given a valid date', () => {
    it('should create the VO successfully', () => {
      const date = new Date('2025-01-15T10:00:00Z');
      const vo = new UsedAtVO(date);

      expect(vo.toString()).toBe(date.toISOString());
    });
  });

  describe('Given an invalid date', () => {
    it('should throw an error', () => {
      expect(() => new UsedAtVO(new Date('invalid'))).toThrow('UsedAt date is invalid');
    });
  });

  describe('toDate', () => {
    it('should return a new Date instance (defensive copy)', () => {
      const original = new Date('2025-01-15T10:00:00Z');
      const vo = new UsedAtVO(original);
      const returned = vo.toDate();

      expect(returned).toEqual(original);
      expect(returned).not.toBe(original);
    });
  });

  describe('now', () => {
    it('should create a VO with the current date', () => {
      const before = Date.now();
      const vo = UsedAtVO.now();
      const after = Date.now();

      expect(vo.toDate().getTime()).toBeGreaterThanOrEqual(before);
      expect(vo.toDate().getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('equals', () => {
    it('should return true for VOs with the same date', () => {
      const date = new Date('2025-01-15T10:00:00Z');
      const vo1 = new UsedAtVO(date);
      const vo2 = new UsedAtVO(date);

      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for VOs with different dates', () => {
      const vo1 = new UsedAtVO(new Date('2025-01-15T10:00:00Z'));
      const vo2 = new UsedAtVO(new Date('2025-01-16T10:00:00Z'));

      expect(vo1.equals(vo2)).toBe(false);
    });
  });
});
