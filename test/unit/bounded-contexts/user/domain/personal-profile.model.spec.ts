import { PersonalProfileModel } from '@user/profile/domain/models/personal-profile.model';

const BASE_PROPS = {
  id: 10,
  uuid: '550e8400-e29b-41d4-a716-446655440000',
  profileId: 5,
  username: 'johndoe',
  displayName: 'John Doe' as string | null,
  avatarUrl: 'https://cdn.example.com/avatar.png' as string | null,
  locale: 'en',
  timezone: 'America/New_York',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-02-01'),
  archivedAt: null as Date | null,
};

describe('PersonalProfileModel', () => {
  describe('Given PersonalProfileModel.reconstitute() is called with full persisted data', () => {
    describe('When all fields are populated', () => {
      it('Then profileId getter returns the persisted profile id', () => {
        const model = PersonalProfileModel.reconstitute(BASE_PROPS);
        expect(model.profileId).toBe(5);
      });

      it('Then username getter returns the persisted username', () => {
        const model = PersonalProfileModel.reconstitute(BASE_PROPS);
        expect(model.username).toBe('johndoe');
      });

      it('Then displayName getter returns the persisted display name', () => {
        const model = PersonalProfileModel.reconstitute(BASE_PROPS);
        expect(model.displayName).toBe('John Doe');
      });

      it('Then avatarUrl getter returns the persisted avatar url', () => {
        const model = PersonalProfileModel.reconstitute(BASE_PROPS);
        expect(model.avatarUrl).toBe('https://cdn.example.com/avatar.png');
      });

      it('Then locale getter returns the persisted locale', () => {
        const model = PersonalProfileModel.reconstitute(BASE_PROPS);
        expect(model.locale).toBe('en');
      });

      it('Then timezone getter returns the persisted timezone', () => {
        const model = PersonalProfileModel.reconstitute(BASE_PROPS);
        expect(model.timezone).toBe('America/New_York');
      });
    });
  });

  describe('Given PersonalProfileModel.reconstitute() is called with nullable fields as null', () => {
    describe('When displayName and avatarUrl are null', () => {
      it('Then displayName getter returns null', () => {
        const model = PersonalProfileModel.reconstitute({ ...BASE_PROPS, displayName: null });
        expect(model.displayName).toBeNull();
      });

      it('Then avatarUrl getter returns null', () => {
        const model = PersonalProfileModel.reconstitute({ ...BASE_PROPS, avatarUrl: null });
        expect(model.avatarUrl).toBeNull();
      });
    });
  });

  describe('Given PersonalProfileModel.create() is called', () => {
    describe('When only required fields are provided', () => {
      it('Then it defaults locale to es and timezone to America/Mexico_City', () => {
        const model = PersonalProfileModel.create({
          profileId: 5,
          username: 'janedoe',
        });

        expect(model.profileId).toBe(5);
        expect(model.username).toBe('janedoe');
        expect(model.displayName).toBeNull();
        expect(model.avatarUrl).toBeNull();
        expect(model.locale).toBe('es');
        expect(model.timezone).toBe('America/Mexico_City');
      });
    });

    describe('When all optional fields are provided', () => {
      it('Then it uses the provided values instead of defaults', () => {
        const model = PersonalProfileModel.create({
          profileId: 10,
          username: 'johndoe',
          displayName: 'John Doe',
          avatarUrl: 'https://cdn.example.com/avatar.png',
          locale: 'en',
          timezone: 'America/New_York',
        });

        expect(model.displayName).toBe('John Doe');
        expect(model.avatarUrl).toBe('https://cdn.example.com/avatar.png');
        expect(model.locale).toBe('en');
        expect(model.timezone).toBe('America/New_York');
      });
    });
  });

  describe('Given a reconstituted PersonalProfileModel', () => {
    describe('When updateLocale() is called with a new locale', () => {
      it('Then the locale is updated and updatedAt is refreshed', () => {
        const model = PersonalProfileModel.reconstitute(BASE_PROPS);
        const originalUpdatedAt = model.updatedAt;

        model.updateLocale('fr');

        expect(model.locale).toBe('fr');
        expect(model.updatedAt.getTime()).toBeGreaterThanOrEqual(
          originalUpdatedAt.getTime(),
        );
      });
    });
  });
});
