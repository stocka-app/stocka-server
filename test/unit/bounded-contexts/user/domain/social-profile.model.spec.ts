import { SocialProfileModel } from '@user/profile/domain/models/social-profile.model';

const BASE_RECONSTITUTE = {
  id: 1,
  uuid: '550e8400-e29b-41d4-a716-446655440100',
  profileId: 10,
  socialAccountUUID: '019538a0-0000-7000-8000-000000000099',
  provider: 'google',
  providerDisplayName: 'Roberto Medina',
  providerAvatarUrl: 'https://example.com/avatar.jpg',
  providerProfileUrl: null,
  givenName: 'Roberto',
  familyName: 'Medina',
  locale: 'es',
  emailVerified: true,
  jobTitle: null,
  rawData: { sub: 'google-sub-001' },
  syncedAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  archivedAt: null,
};

// ─── SocialProfileModel.create ────────────────────────────────────────────────

describe('SocialProfileModel.create', () => {
  describe('Given all optional fields are provided', () => {
    it('Then it creates a model with the provided values', () => {
      const model = SocialProfileModel.create({
        profileId: 10,
        socialAccountUUID: '019538a0-0000-7000-8000-000000000098',
        provider: 'google',
        providerDisplayName: 'Roberto Medina',
        providerAvatarUrl: 'https://example.com/avatar.jpg',
        providerProfileUrl: null,
        givenName: 'Roberto',
        familyName: 'Medina',
        locale: 'es',
        emailVerified: true,
        jobTitle: 'Engineer',
        rawData: { sub: 'sub-001' },
      });

      expect(model.profileId).toBe(10);
      expect(model.socialAccountUUID.toString()).toBe('019538a0-0000-7000-8000-000000000098');
      expect(model.provider).toBe('google');
      expect(model.providerDisplayName).toBe('Roberto Medina');
      expect(model.providerAvatarUrl).toBe('https://example.com/avatar.jpg');
      expect(model.providerProfileUrl).toBeNull();
      expect(model.givenName).toBe('Roberto');
      expect(model.familyName).toBe('Medina');
      expect(model.locale).toBe('es');
      expect(model.emailVerified).toBe(true);
      expect(model.jobTitle).toBe('Engineer');
      expect(model.rawData).toEqual({ sub: 'sub-001' });
      expect(model.syncedAt).toBeInstanceOf(Date);
    });
  });

  describe('Given no optional fields are provided', () => {
    it('Then it applies null / false / empty defaults', () => {
      const model = SocialProfileModel.create({
        profileId: 5,
        socialAccountUUID: '019538a0-0000-7000-8000-000000000097',
        provider: 'microsoft',
      });

      expect(model.providerDisplayName).toBeNull();
      expect(model.providerAvatarUrl).toBeNull();
      expect(model.providerProfileUrl).toBeNull();
      expect(model.givenName).toBeNull();
      expect(model.familyName).toBeNull();
      expect(model.locale).toBeNull();
      expect(model.emailVerified).toBe(false);
      expect(model.jobTitle).toBeNull();
      expect(model.rawData).toEqual({});
    });
  });
});

// ─── SocialProfileModel.reconstitute ──────────────────────────────────────────

describe('SocialProfileModel.reconstitute', () => {
  describe('Given a full set of persisted props', () => {
    it('Then it reconstructs the model with all values intact', () => {
      const model = SocialProfileModel.reconstitute(BASE_RECONSTITUTE);

      expect(model.id).toBe(1);
      expect(model.uuid).toBe('550e8400-e29b-41d4-a716-446655440100');
      expect(model.profileId).toBe(10);
      expect(model.socialAccountUUID.toString()).toBe('019538a0-0000-7000-8000-000000000099');
      expect(model.provider).toBe('google');
      expect(model.providerDisplayName).toBe('Roberto Medina');
      expect(model.providerAvatarUrl).toBe('https://example.com/avatar.jpg');
      expect(model.providerProfileUrl).toBeNull();
      expect(model.givenName).toBe('Roberto');
      expect(model.familyName).toBe('Medina');
      expect(model.locale).toBe('es');
      expect(model.emailVerified).toBe(true);
      expect(model.jobTitle).toBeNull();
      expect(model.rawData).toEqual({ sub: 'google-sub-001' });
      expect(model.syncedAt).toEqual(new Date('2024-01-01'));
      expect(model.createdAt).toEqual(new Date('2024-01-01'));
    });
  });
});

// ─── SocialProfileModel.refreshSync ──────────────────────────────────────────

describe('SocialProfileModel.refreshSync', () => {
  describe('Given a reconstituted model', () => {
    let model: SocialProfileModel;

    beforeEach(() => {
      model = SocialProfileModel.reconstitute(BASE_RECONSTITUTE);
    });

    describe('When refreshSync is called with new values', () => {
      it('Then it updates only the provided fields', () => {
        const beforeSync = model.syncedAt;

        model.refreshSync({
          providerDisplayName: 'Roberto Eduardo Medina',
          givenName: 'Roberto Eduardo',
          familyName: 'Medina Austin',
          locale: 'en',
          emailVerified: false,
          jobTitle: 'Senior Engineer',
          rawData: { sub: 'new-sub' },
          providerAvatarUrl: 'https://example.com/new-avatar.jpg',
        });

        expect(model.providerDisplayName).toBe('Roberto Eduardo Medina');
        expect(model.givenName).toBe('Roberto Eduardo');
        expect(model.familyName).toBe('Medina Austin');
        expect(model.locale).toBe('en');
        expect(model.emailVerified).toBe(false);
        expect(model.jobTitle).toBe('Senior Engineer');
        expect(model.rawData).toEqual({ sub: 'new-sub' });
        expect(model.providerAvatarUrl).toBe('https://example.com/new-avatar.jpg');
        expect(model.syncedAt.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
      });
    });

    describe('When refreshSync is called with no fields', () => {
      it('Then it only updates syncedAt', () => {
        const beforeDisplayName = model.providerDisplayName;
        const beforeSync = model.syncedAt;

        model.refreshSync({});

        expect(model.providerDisplayName).toBe(beforeDisplayName);
        expect(model.syncedAt.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
      });
    });

    describe('When refreshSync is called with explicit null values', () => {
      it('Then it sets those fields to null', () => {
        model.refreshSync({
          providerDisplayName: null,
          providerAvatarUrl: null,
          givenName: null,
          familyName: null,
          locale: null,
          jobTitle: null,
        });

        expect(model.providerDisplayName).toBeNull();
        expect(model.providerAvatarUrl).toBeNull();
        expect(model.givenName).toBeNull();
        expect(model.familyName).toBeNull();
        expect(model.locale).toBeNull();
        expect(model.jobTitle).toBeNull();
      });
    });
  });
});
