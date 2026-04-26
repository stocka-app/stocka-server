import { SocialSessionModel } from '@user/account/session/domain/models/social-session.model';

describe('SocialSessionModel', () => {
  describe('Given a socialAccountId and provider to create a new social session', () => {
    describe('When create is called', () => {
      it('Then it returns a SocialSessionModel with the given props', () => {
        const model = SocialSessionModel.create({ socialAccountId: 7, provider: 'google' });

        expect(model.socialAccountId).toBe(7);
        expect(model.provider).toBe('google');
      });

      it('Then sessionId is not set (filled by repo after parent session is persisted)', () => {
        const model = SocialSessionModel.create({ socialAccountId: 7, provider: 'google' });

        expect(model.sessionId).toBeUndefined();
      });
    });
  });

  describe('Given persisted social session data to reconstitute', () => {
    describe('When reconstitute is called', () => {
      it('Then it returns a SocialSessionModel with all persisted fields', () => {
        const model = SocialSessionModel.reconstitute({
          id: 2,
          uuid: '550e8400-e29b-41d4-a716-446655440001',
          sessionId: 20,
          socialAccountId: 7,
          provider: 'facebook',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          archivedAt: null,
        });

        expect(model.id).toBe(2);
        expect(model.uuid.toString()).toBe('550e8400-e29b-41d4-a716-446655440001');
        expect(model.sessionId).toBe(20);
        expect(model.socialAccountId).toBe(7);
        expect(model.provider).toBe('facebook');
        expect(model.archivedAt).toBeNull();
      });
    });
  });
});
