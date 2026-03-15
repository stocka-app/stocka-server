import { extractLocale } from '@shared/infrastructure/i18n/locale.helper';

describe('extractLocale', () => {
  describe('Given an Accept-Language header starting with "en"', () => {
    it('Then it returns "en"', () => {
      expect(extractLocale({ 'accept-language': 'en-US,en;q=0.9' })).toBe('en');
    });

    it('Then it returns "en" for plain "en"', () => {
      expect(extractLocale({ 'accept-language': 'en' })).toBe('en');
    });

    it('Then it returns "en" regardless of casing', () => {
      expect(extractLocale({ 'accept-language': 'EN-US' })).toBe('en');
    });
  });

  describe('Given an Accept-Language header starting with "es"', () => {
    it('Then it returns "es"', () => {
      expect(extractLocale({ 'accept-language': 'es-MX' })).toBe('es');
    });

    it('Then it returns "es" for plain "es"', () => {
      expect(extractLocale({ 'accept-language': 'es' })).toBe('es');
    });
  });

  describe('Given an unknown or missing Accept-Language header', () => {
    it('Then it defaults to "es" when the header is undefined', () => {
      expect(extractLocale({})).toBe('es');
    });

    it('Then it defaults to "es" when the header is an unrecognized language', () => {
      expect(extractLocale({ 'accept-language': 'fr-FR' })).toBe('es');
    });

    it('Then it defaults to "es" when the header is an empty string', () => {
      expect(extractLocale({ 'accept-language': '' })).toBe('es');
    });
  });

  describe('Given an Accept-Language header provided as an array', () => {
    it('Then it uses the first element to determine locale', () => {
      expect(extractLocale({ 'accept-language': ['en-US', 'es-MX'] })).toBe('en');
    });

    it('Then it defaults to "es" when the first element is not English', () => {
      expect(extractLocale({ 'accept-language': ['es-MX', 'en-US'] })).toBe('es');
    });
  });
});
