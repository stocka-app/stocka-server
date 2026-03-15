import { CryptoCodeGeneratorService } from '@shared/infrastructure/services/crypto-code-generator.service';

describe('CryptoCodeGeneratorService', () => {
  let service: CryptoCodeGeneratorService;

  beforeEach(() => {
    service = new CryptoCodeGeneratorService();
  });

  describe('Given a CryptoCodeGeneratorService instance', () => {
    describe('When generateVerificationCode is called', () => {
      it('Then it returns a 6-character string', () => {
        const code = service.generateVerificationCode();
        expect(code).toHaveLength(6);
      });

      it('Then each character belongs to the allowed charset', () => {
        const charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        const code = service.generateVerificationCode();
        for (const char of code) {
          expect(charset).toContain(char);
        }
      });

      it('Then two consecutive calls produce different codes (probabilistically)', () => {
        // Generating multiple codes — statistically they should differ
        const codes = new Set(Array.from({ length: 20 }, () => service.generateVerificationCode()));
        expect(codes.size).toBeGreaterThan(1);
      });
    });

    describe('When generateSecureToken is called', () => {
      it('Then it returns a 64-character hex string', () => {
        const token = service.generateSecureToken();
        expect(token).toHaveLength(64);
        expect(/^[0-9a-f]+$/.test(token)).toBe(true);
      });

      it('Then two consecutive calls produce different tokens', () => {
        const token1 = service.generateSecureToken();
        const token2 = service.generateSecureToken();
        expect(token1).not.toBe(token2);
      });
    });

    describe('When hashCode is called', () => {
      it('Then it returns a deterministic SHA-256 hex digest for a given input', () => {
        const hash1 = service.hashCode('ABC123');
        const hash2 = service.hashCode('ABC123');
        expect(hash1).toBe(hash2);
      });

      it('Then different inputs produce different hashes', () => {
        const hash1 = service.hashCode('ABC123');
        const hash2 = service.hashCode('XYZ789');
        expect(hash1).not.toBe(hash2);
      });

      it('Then the hash is a 64-character lowercase hex string (SHA-256)', () => {
        const hash = service.hashCode('TEST');
        expect(hash).toHaveLength(64);
        expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
      });
    });
  });
});
