import { OAuthProviderVO, OAuthProviderEnum } from '@user/domain/value-objects/oauth-provider.vo';

describe('OAuthProviderVO', () => {
  describe('Given a valid provider string', () => {
    it.each([
      ['email', OAuthProviderEnum.LOCAL],
      ['google', OAuthProviderEnum.GOOGLE],
      ['facebook', OAuthProviderEnum.FACEBOOK],
      ['microsoft', OAuthProviderEnum.MICROSOFT],
      ['apple', OAuthProviderEnum.APPLE],
    ])('should create the VO for "%s"', (value) => {
      const vo = new OAuthProviderVO(value);

      expect(vo.toString()).toBe(value);
    });
  });

  describe('Given an invalid provider string', () => {
    it('should throw InvalidOAuthProviderException', () => {
      expect(() => new OAuthProviderVO('twitter')).toThrow('Invalid OAuth provider: twitter');
    });

    it('should throw for an empty string', () => {
      expect(() => new OAuthProviderVO('')).toThrow('Invalid OAuth provider: ');
    });
  });

  describe('isLocal / isSocial', () => {
    it('should return isLocal=true and isSocial=false for email provider', () => {
      const vo = OAuthProviderVO.local();

      expect(vo.isLocal()).toBe(true);
      expect(vo.isSocial()).toBe(false);
    });

    it.each([
      ['google', OAuthProviderVO.google()],
      ['facebook', OAuthProviderVO.facebook()],
      ['microsoft', OAuthProviderVO.microsoft()],
    ])('should return isLocal=false and isSocial=true for %s provider', (_label, vo) => {
      expect(vo.isLocal()).toBe(false);
      expect(vo.isSocial()).toBe(true);
    });

    it('should return isSocial=true for apple provider created via constructor', () => {
      const vo = new OAuthProviderVO('apple');

      expect(vo.isLocal()).toBe(false);
      expect(vo.isSocial()).toBe(true);
    });
  });

  describe('factory methods', () => {
    it('should create a local provider', () => {
      expect(OAuthProviderVO.local().toString()).toBe('email');
    });

    it('should create a google provider', () => {
      expect(OAuthProviderVO.google().toString()).toBe('google');
    });

    it('should create a facebook provider', () => {
      expect(OAuthProviderVO.facebook().toString()).toBe('facebook');
    });

    it('should create a microsoft provider', () => {
      expect(OAuthProviderVO.microsoft().toString()).toBe('microsoft');
    });
  });

  describe('equals', () => {
    it('should return true for VOs with the same provider', () => {
      const vo1 = new OAuthProviderVO('google');
      const vo2 = new OAuthProviderVO('google');

      expect(vo1.equals(vo2)).toBe(true);
    });

    it('should return false for VOs with different providers', () => {
      const vo1 = new OAuthProviderVO('google');
      const vo2 = new OAuthProviderVO('facebook');

      expect(vo1.equals(vo2)).toBe(false);
    });

    it('should return false when compared to a non-OAuthProviderVO', () => {
      const vo = OAuthProviderVO.google();
      expect(vo.equals(null as unknown as OAuthProviderVO)).toBe(false);
    });
  });
});
