import { UserMapper } from '@user/infrastructure/persistence/mappers/user.mapper';
import { SocialAccountMapper } from '@user/infrastructure/persistence/mappers/social-account.mapper';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { SocialAccountModel } from '@user/account/domain/models/social-account.model';
import { UserEntity } from '@user/infrastructure/persistence/entities/user.entity';
import { SocialAccountEntity } from '@user/account/infrastructure/entities/social-account.entity';

// ── Builders ───────────────────────────────────────────────────────────────────

const USER_UUID = '550e8400-e29b-41d4-a716-446655440010';
const SA_UUID = '550e8400-e29b-41d4-a716-446655440011';

function buildUserEntity(overrides?: Partial<UserEntity>): UserEntity {
  const e = new UserEntity();
  e.id = 1;
  e.uuid = USER_UUID;
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-01-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

function buildSocialAccountEntity(overrides?: Partial<SocialAccountEntity>): SocialAccountEntity {
  const e = new SocialAccountEntity();
  e.id = 10;
  e.uuid = SA_UUID;
  e.accountId = 1;
  e.provider = 'google';
  e.providerId = 'google-provider-id-123';
  e.providerEmail = null;
  e.linkedAt = new Date('2024-01-01');
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-01-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

// ── UserMapper ─────────────────────────────────────────────────────────────────

describe('UserMapper', () => {
  describe('Given a UserEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a UserAggregate with id, uuid, and timestamps mapped', () => {
        const entity = buildUserEntity();
        const model = UserMapper.toDomain(entity);

        expect(model).toBeInstanceOf(UserAggregate);
        expect(model.id).toBe(entity.id);
        expect(model.uuid).toBe(entity.uuid);
        expect(model.archivedAt).toBeNull();
      });
    });

    describe('When toDomain is called with an archived entity', () => {
      it('Then isArchived() returns true on the resulting aggregate', () => {
        const archivedAt = new Date('2024-06-01');
        const entity = buildUserEntity({ archivedAt });
        const model = UserMapper.toDomain(entity);

        expect(model.isArchived()).toBe(true);
        expect(model.archivedAt).toEqual(archivedAt);
      });
    });
  });

  describe('Given a UserAggregate with an id', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a Partial<UserEntity> including the id and uuid', () => {
        const entity = buildUserEntity();
        const model = UserMapper.toDomain(entity);
        const result = UserMapper.toEntity(model);

        expect(result.id).toBe(1);
        expect(result.uuid).toBe(USER_UUID);
      });
    });
  });

  describe('Given a UserAggregate without an id (new user)', () => {
    describe('When toEntity is called', () => {
      it('Then the id field is omitted from the result', () => {
        const aggregate = UserAggregate.create();
        const result = UserMapper.toEntity(aggregate);

        expect(result.id).toBeUndefined();
        expect(result.uuid).toBeDefined();
      });
    });
  });
});

// ── SocialAccountMapper ────────────────────────────────────────────────────────

describe('SocialAccountMapper', () => {
  describe('Given a SocialAccountEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a SocialAccountModel with all fields mapped', () => {
        const entity = buildSocialAccountEntity();
        const model = SocialAccountMapper.toDomain(entity);

        expect(model).toBeInstanceOf(SocialAccountModel);
        expect(model.id).toBe(entity.id);
        expect(model.uuid).toBe(entity.uuid);
        expect(model.accountId).toBe(entity.accountId);
        expect(model.provider).toBe(entity.provider);
        expect(model.providerId).toBe(entity.providerId);
        expect(model.providerEmail).toBeNull();
        expect(model.linkedAt).toEqual(entity.linkedAt);
      });
    });

    describe('When toDomain is called with a providerEmail set', () => {
      it('Then providerEmail is mapped correctly', () => {
        const entity = buildSocialAccountEntity({ providerEmail: 'social@gmail.com' });
        const model = SocialAccountMapper.toDomain(entity);

        expect(model.providerEmail).toBe('social@gmail.com');
      });
    });

    describe('When toDomain is called for a Facebook social account', () => {
      it('Then provider and providerId are mapped correctly', () => {
        const entity = buildSocialAccountEntity({ provider: 'facebook', providerId: 'fb-123' });
        const model = SocialAccountMapper.toDomain(entity);

        expect(model.provider).toBe('facebook');
        expect(model.providerId).toBe('fb-123');
      });
    });
  });
});
