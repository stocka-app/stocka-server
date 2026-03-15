import { AccountTypeVO, AccountTypeEnum } from '@user/domain/value-objects/account-type.vo';

describe('AccountTypeVO', () => {
  describe('Given a valid account type string', () => {
    it.each([
      ['manual', AccountTypeEnum.MANUAL],
      ['social', AccountTypeEnum.SOCIAL],
      ['flexible', AccountTypeEnum.FLEXIBLE],
    ])('should create the VO for "%s"', (value) => {
      const vo = new AccountTypeVO(value);

      expect(vo.toString()).toBe(value);
    });
  });

  describe('Given an invalid account type string', () => {
    it('should throw InvalidAccountTypeException', () => {
      expect(() => new AccountTypeVO('unknown')).toThrow('Invalid account type: unknown');
    });
  });

  describe('type checks', () => {
    it('should identify manual account type', () => {
      const vo = AccountTypeVO.manual();

      expect(vo.isManual()).toBe(true);
      expect(vo.isSocial()).toBe(false);
      expect(vo.isFlexible()).toBe(false);
    });

    it('should identify social account type', () => {
      const vo = AccountTypeVO.social();

      expect(vo.isManual()).toBe(false);
      expect(vo.isSocial()).toBe(true);
      expect(vo.isFlexible()).toBe(false);
    });

    it('should identify flexible account type', () => {
      const vo = AccountTypeVO.flexible();

      expect(vo.isManual()).toBe(false);
      expect(vo.isSocial()).toBe(false);
      expect(vo.isFlexible()).toBe(true);
    });
  });

  describe('factory methods', () => {
    it('should create a manual type', () => {
      expect(AccountTypeVO.manual().toString()).toBe('manual');
    });

    it('should create a social type', () => {
      expect(AccountTypeVO.social().toString()).toBe('social');
    });

    it('should create a flexible type', () => {
      expect(AccountTypeVO.flexible().toString()).toBe('flexible');
    });
  });

  describe('equals', () => {
    it('should return true for VOs with the same type', () => {
      const vo1 = AccountTypeVO.manual();
      const vo2 = AccountTypeVO.manual();

      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for VOs with different types', () => {
      const vo1 = AccountTypeVO.manual();
      const vo2 = AccountTypeVO.social();

      expect(vo1.equals(vo2)).toBe(false);
    });

    it('should return false when compared to a non-AccountTypeVO', () => {
      const vo = AccountTypeVO.manual();
      expect(vo.equals(null as unknown as AccountTypeVO)).toBe(false);
    });
  });
});
