import {
  SocialProvider,
  ACTIVE_SOCIAL_PROVIDERS,
  DISABLED_SOCIAL_PROVIDERS,
  isActiveProvider,
} from '@authentication/domain/enums/social-provider.enum';

describe('SocialProvider enum', () => {
  describe('ACTIVE_SOCIAL_PROVIDERS', () => {
    it('should include google, facebook, and microsoft', () => {
      expect(ACTIVE_SOCIAL_PROVIDERS).toContain(SocialProvider.GOOGLE);
      expect(ACTIVE_SOCIAL_PROVIDERS).toContain(SocialProvider.FACEBOOK);
      expect(ACTIVE_SOCIAL_PROVIDERS).toContain(SocialProvider.MICROSOFT);
    });

    it('should not include apple', () => {
      expect(ACTIVE_SOCIAL_PROVIDERS).not.toContain(SocialProvider.APPLE);
    });
  });

  describe('DISABLED_SOCIAL_PROVIDERS', () => {
    it('should include apple only', () => {
      expect(DISABLED_SOCIAL_PROVIDERS).toEqual([SocialProvider.APPLE]);
    });
  });

  describe('isActiveProvider', () => {
    it('should return true for active providers', () => {
      expect(isActiveProvider('google')).toBe(true);
      expect(isActiveProvider('facebook')).toBe(true);
      expect(isActiveProvider('microsoft')).toBe(true);
    });

    it('should return false for disabled providers', () => {
      expect(isActiveProvider('apple')).toBe(false);
    });

    it('should return false for unknown strings', () => {
      expect(isActiveProvider('twitter')).toBe(false);
      expect(isActiveProvider('')).toBe(false);
    });
  });
});
