import { ConsentType } from '@user/domain/enums/consent-type.enum';

describe('ConsentType', () => {
  describe('Given the ConsentType enum', () => {
    it('Then it should have exactly 4 members', () => {
      const values = Object.values(ConsentType);
      expect(values).toHaveLength(4);
    });

    it('Then TERMS_OF_SERVICE equals "terms_of_service"', () => {
      expect(ConsentType.TERMS_OF_SERVICE).toBe('terms_of_service');
    });

    it('Then PRIVACY_POLICY equals "privacy_policy"', () => {
      expect(ConsentType.PRIVACY_POLICY).toBe('privacy_policy');
    });

    it('Then MARKETING_COMMUNICATIONS equals "marketing_communications"', () => {
      expect(ConsentType.MARKETING_COMMUNICATIONS).toBe('marketing_communications');
    });

    it('Then ANONYMOUS_ANALYTICS equals "anonymous_analytics"', () => {
      expect(ConsentType.ANONYMOUS_ANALYTICS).toBe('anonymous_analytics');
    });
  });
});
