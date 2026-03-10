import { ExpiresAtVO } from '@shared/domain/value-objects/compound/expires-at.vo';

describe('ExpiresAtVO', () => {
  describe('Given a valid future date', () => {
    it('should create the VO successfully', () => {
      const future = new Date();
      future.setDate(future.getDate() + 7);

      const vo = new ExpiresAtVO(future);

      expect(vo.toString()).toBe(future.toISOString());
      expect(vo.isExpired()).toBe(false);
    });
  });

  describe('Given a past date', () => {
    it('should create the VO (needed for reconstitution) and report expired', () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);

      const vo = new ExpiresAtVO(past);

      expect(vo.isExpired()).toBe(true);
    });
  });

  describe('Given an invalid date', () => {
    it('should throw an error', () => {
      expect(() => new ExpiresAtVO(new Date('invalid'))).toThrow('ExpiresAt date is invalid');
    });
  });

  describe('toDate', () => {
    it('should return a new Date instance (defensive copy)', () => {
      const original = new Date();
      const vo = new ExpiresAtVO(original);
      const returned = vo.toDate();

      expect(returned).toEqual(original);
      expect(returned).not.toBe(original);

      returned.setFullYear(2000);
      expect(vo.toDate()).toEqual(original);
    });
  });

  describe('equals', () => {
    it('should return true for VOs with the same date', () => {
      const date = new Date('2025-06-01T12:00:00Z');
      const vo1 = new ExpiresAtVO(date);
      const vo2 = new ExpiresAtVO(date);

      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for VOs with different dates', () => {
      const vo1 = new ExpiresAtVO(new Date('2025-06-01T12:00:00Z'));
      const vo2 = new ExpiresAtVO(new Date('2025-06-02T12:00:00Z'));

      expect(vo1.equals(vo2)).toBe(false);
    });
  });
});
