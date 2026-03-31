import { CredentialSessionModel } from '@user/account/session/domain/models/credential-session.model';

describe('CredentialSessionModel', () => {
  describe('Given a credentialAccountId to create a new credential session', () => {
    describe('When create is called', () => {
      it('Then it returns a CredentialSessionModel with the given credentialAccountId', () => {
        const model = CredentialSessionModel.create({ credentialAccountId: 42 });

        expect(model.credentialAccountId).toBe(42);
      });

      it('Then sessionId is not set (filled by repo after parent session is persisted)', () => {
        const model = CredentialSessionModel.create({ credentialAccountId: 42 });

        expect(model.sessionId).toBeUndefined();
      });
    });
  });

  describe('Given persisted credential session data to reconstitute', () => {
    describe('When reconstitute is called', () => {
      it('Then it returns a CredentialSessionModel with all persisted fields', () => {
        const model = CredentialSessionModel.reconstitute({
          id: 1,
          uuid: '550e8400-e29b-41d4-a716-446655440000',
          sessionId: 10,
          credentialAccountId: 42,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          archivedAt: null,
        });

        expect(model.id).toBe(1);
        expect(model.uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(model.sessionId).toBe(10);
        expect(model.credentialAccountId).toBe(42);
        expect(model.archivedAt).toBeNull();
      });
    });
  });
});
