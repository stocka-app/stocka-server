import { PersonalProfileModel } from '@user/profile/domain/models/personal-profile.model';
import { PersonalProfileEntity } from '@user/profile/infrastructure/entities/personal-profile.entity';
import { PersonalProfileMapper } from '@user/profile/infrastructure/mappers/personal-profile.mapper';

const PROFILE_UUID = '019538a0-0000-7000-8000-000000000001';
const NOW = new Date('2024-06-01T00:00:00.000Z');

function buildEntity(overrides: Partial<PersonalProfileEntity> = {}): PersonalProfileEntity {
  const entity = new PersonalProfileEntity();
  Object.assign(entity, {
    id: 1,
    uuid: PROFILE_UUID,
    profileId: 7,
    username: 'austin',
    displayName: null,
    avatarUrl: null,
    locale: 'es-MX',
    timezone: 'America/Mexico_City',
    createdAt: NOW,
    updatedAt: NOW,
    archivedAt: null,
    ...overrides,
  });
  return entity;
}

describe('PersonalProfileMapper', () => {
  describe('toEntity', () => {
    describe('Given a personal profile with displayName and avatarUrl populated', () => {
      it('Then it serializes the values', () => {
        const model = PersonalProfileMapper.toDomain(
          buildEntity({
            displayName: 'Austin',
            avatarUrl: 'https://example.com/avatar.png',
          }),
        );

        const entity = PersonalProfileMapper.toEntity(model);

        expect(entity.displayName).toBe('Austin');
        expect(entity.avatarUrl).toBe('https://example.com/avatar.png');
      });
    });

    describe('Given a personal profile with null displayName and avatarUrl', () => {
      it('Then it serializes nulls', () => {
        const model = PersonalProfileMapper.toDomain(buildEntity());

        const entity = PersonalProfileMapper.toEntity(model);

        expect(entity.displayName).toBeNull();
        expect(entity.avatarUrl).toBeNull();
      });
    });
  });
});
