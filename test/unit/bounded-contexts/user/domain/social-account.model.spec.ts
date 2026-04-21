import { SocialAccountModel } from '@user/account/domain/models/social-account.model';

describe('SocialAccountModel (account bounded context)', () => {
  describe('Given SocialAccountModel.create() is called', () => {
    describe('When all required fields are provided', () => {
      it('Then it stores accountId, provider, and providerId', () => {
        const account = SocialAccountModel.create({
          accountId: 10,
          provider: 'google',
          providerId: 'google-123',
        });

        expect(account.accountId).toBe(10);
        expect(account.provider).toBe('google');
        expect(account.providerId).toBe('google-123');
      });

      it('Then providerEmail defaults to null when not provided', () => {
        const account = SocialAccountModel.create({
          accountId: 1,
          provider: 'facebook',
          providerId: 'fb-456',
        });

        expect(account.providerEmail).toBeNull();
      });

      it('Then linkedAt is set to a recent date', () => {
        const before = Date.now();
        const account = SocialAccountModel.create({
          accountId: 1,
          provider: 'google',
          providerId: 'id-789',
        });
        const after = Date.now();

        expect(account.linkedAt.getTime()).toBeGreaterThanOrEqual(before);
        expect(account.linkedAt.getTime()).toBeLessThanOrEqual(after);
      });
    });

    describe('When providerEmail is explicitly provided', () => {
      it('Then it stores the provided email', () => {
        const account = SocialAccountModel.create({
          accountId: 5,
          provider: 'google',
          providerId: 'google-abc',
          providerEmail: 'user@gmail.com',
        });

        expect(account.providerEmail).toBe('user@gmail.com');
      });
    });
  });

  describe('Given SocialAccountModel.reconstitute() is called with persisted data', () => {
    describe('When all fields are populated', () => {
      it('Then all getters return the persisted values', () => {
        const linkedAt = new Date('2024-03-15');
        const account = SocialAccountModel.reconstitute({
          id: 1,
          uuid: '550e8400-e29b-41d4-a716-446655440000',
          accountId: 10,
          provider: 'google',
          providerId: 'google-123',
          providerEmail: 'user@gmail.com',
          linkedAt,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-02-01'),
          archivedAt: null,
        });

        expect(account.accountId).toBe(10);
        expect(account.provider).toBe('google');
        expect(account.providerId).toBe('google-123');
        expect(account.providerEmail).toBe('user@gmail.com');
        expect(account.linkedAt).toBe(linkedAt);
      });
    });
  });
});
