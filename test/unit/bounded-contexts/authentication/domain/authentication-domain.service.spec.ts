import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';

describe('AuthenticationDomainService', () => {
  describe('Given hashToken() is called with a token string', () => {
    describe('When the same token is hashed twice', () => {
      it('Then it returns the same deterministic SHA-256 hex string', () => {
        const token = 'my-random-token-value';
        const hash1 = AuthenticationDomainService.hashToken(token);
        const hash2 = AuthenticationDomainService.hashToken(token);

        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64);
      });
    });

    describe('When different tokens are hashed', () => {
      it('Then it returns different hashes', () => {
        const hash1 = AuthenticationDomainService.hashToken('token-a');
        const hash2 = AuthenticationDomainService.hashToken('token-b');

        expect(hash1).not.toBe(hash2);
      });
    });
  });

  describe('Given generateRandomToken() is called', () => {
    describe('When a token is generated', () => {
      it('Then it returns a 64-character hex string (32 bytes)', () => {
        const token = AuthenticationDomainService.generateRandomToken();

        expect(token).toHaveLength(64);
        expect(token).toMatch(/^[0-9a-f]{64}$/);
      });
    });

    describe('When two tokens are generated', () => {
      it('Then they are unique', () => {
        const token1 = AuthenticationDomainService.generateRandomToken();
        const token2 = AuthenticationDomainService.generateRandomToken();

        expect(token1).not.toBe(token2);
      });
    });
  });

  describe('Given a plain password and its hash', () => {
    describe('When comparePasswords() is called with the correct password', () => {
      it('Then it returns true', async () => {
        const plain = 'SecureP@ss123';
        const hash = await AuthenticationDomainService.hashPassword(plain);

        const result = await AuthenticationDomainService.comparePasswords(plain, hash);

        expect(result).toBe(true);
      });
    });

    describe('When comparePasswords() is called with a wrong password', () => {
      it('Then it returns false', async () => {
        const hash = await AuthenticationDomainService.hashPassword('CorrectPassword');

        const result = await AuthenticationDomainService.comparePasswords('WrongPassword', hash);

        expect(result).toBe(false);
      });
    });
  });
});
