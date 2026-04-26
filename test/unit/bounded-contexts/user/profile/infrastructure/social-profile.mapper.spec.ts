import { SocialProfileModel } from '@user/profile/domain/models/social-profile.model';
import { SocialProfileEntity } from '@user/profile/infrastructure/entities/social-profile.entity';
import { SocialProfileMapper } from '@user/profile/infrastructure/mappers/social-profile.mapper';

const PROFILE_UUID = '019538a0-0000-7000-8000-000000000001';
const SOCIAL_ACCOUNT_UUID = '019538a0-0000-7000-8000-000000000002';
const NOW = new Date('2024-06-01T00:00:00.000Z');

function buildEntity(overrides: Partial<SocialProfileEntity> = {}): SocialProfileEntity {
  const entity = new SocialProfileEntity();
  Object.assign(entity, {
    id: 1,
    uuid: PROFILE_UUID,
    profileId: 7,
    socialAccountUUID: SOCIAL_ACCOUNT_UUID,
    provider: 'google',
    providerDisplayName: null,
    providerAvatarUrl: null,
    providerProfileUrl: null,
    givenName: null,
    familyName: null,
    locale: null,
    emailVerified: false,
    jobTitle: null,
    rawData: {},
    syncedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    archivedAt: null,
    ...overrides,
  });
  return entity;
}

describe('SocialProfileMapper', () => {
  describe('toDomain', () => {
    describe('Given a persisted social profile with all VO-typed fields populated', () => {
      it('Then it reconstitutes the SocialProfileModel with the populated values', () => {
        const entity = buildEntity({
          providerDisplayName: 'Austin',
          providerAvatarUrl: 'https://example.com/a.png',
          providerProfileUrl: 'https://example.com/profile/123',
          givenName: 'Austin',
          familyName: 'Medina',
          locale: 'es-MX',
          emailVerified: true,
          jobTitle: 'Engineer',
        });

        const model = SocialProfileMapper.toDomain(entity);

        expect(model.providerDisplayName?.getValue()).toBe('Austin');
        expect(model.providerAvatarUrl?.getValue()).toBe('https://example.com/a.png');
        expect(model.providerProfileUrl?.getValue()).toBe('https://example.com/profile/123');
        expect(model.givenName?.getValue()).toBe('Austin');
        expect(model.familyName?.getValue()).toBe('Medina');
        expect(model.jobTitle?.getValue()).toBe('Engineer');
        expect(model.emailVerified).toBe(true);
      });
    });

    describe('Given a persisted social profile with all VO-typed fields null', () => {
      it('Then the model exposes nulls for those fields', () => {
        const model = SocialProfileMapper.toDomain(buildEntity());

        expect(model.providerDisplayName).toBeNull();
        expect(model.providerAvatarUrl).toBeNull();
        expect(model.providerProfileUrl).toBeNull();
        expect(model.givenName).toBeNull();
        expect(model.familyName).toBeNull();
        expect(model.jobTitle).toBeNull();
      });
    });
  });

  describe('toEntity', () => {
    describe('Given a SocialProfile model with VOs populated', () => {
      it('Then toEntity serializes back the primitive values', () => {
        const entity = buildEntity({
          providerDisplayName: 'Austin',
          providerAvatarUrl: 'https://example.com/a.png',
          providerProfileUrl: 'https://example.com/profile/123',
          givenName: 'Austin',
          familyName: 'Medina',
          jobTitle: 'Engineer',
        });
        const model = SocialProfileMapper.toDomain(entity);

        const result = SocialProfileMapper.toEntity(model);

        expect(result.providerDisplayName).toBe('Austin');
        expect(result.providerAvatarUrl).toBe('https://example.com/a.png');
        expect(result.providerProfileUrl).toBe('https://example.com/profile/123');
        expect(result.givenName).toBe('Austin');
        expect(result.familyName).toBe('Medina');
        expect(result.jobTitle).toBe('Engineer');
      });
    });

    describe('Given a SocialProfile model with all optional VOs null', () => {
      it('Then toEntity serializes nulls back', () => {
        const model = SocialProfileMapper.toDomain(buildEntity());

        const result = SocialProfileMapper.toEntity(model);

        expect(result.providerDisplayName).toBeNull();
        expect(result.providerAvatarUrl).toBeNull();
        expect(result.providerProfileUrl).toBeNull();
        expect(result.givenName).toBeNull();
        expect(result.familyName).toBeNull();
        expect(result.jobTitle).toBeNull();
      });
    });
  });
});
