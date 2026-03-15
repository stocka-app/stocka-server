import { UserMapper } from '@user/infrastructure/persistence/mappers/user.mapper';
import { SocialAccountMapper } from '@user/infrastructure/persistence/mappers/social-account.mapper';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { SocialAccountModel } from '@user/domain/models/social-account.model';
import { UserEntity } from '@user/infrastructure/persistence/entities/user.entity';
import { SocialAccountEntity } from '@user/infrastructure/persistence/entities/social-account.entity';

// ── Builders ───────────────────────────────────────────────────────────────────

// Valid UUID v4 constants
const USER_UUID = '550e8400-e29b-41d4-a716-446655440010';
const SA_UUID = '550e8400-e29b-41d4-a716-446655440011';

function buildUserEntity(overrides?: Partial<UserEntity>): UserEntity {
  const e = new UserEntity();
  e.id = 1;
  e.uuid = USER_UUID;
  e.email = 'user@example.com';
  e.username = 'testuser';
  e.passwordHash = '$2b$12$hashed-password';
  e.status = 'active';
  e.emailVerifiedAt = new Date('2024-01-01');
  e.verificationBlockedUntil = null;
  e.createdWith = 'email';
  e.accountType = 'manual';
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-01-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

function buildSocialAccountEntity(overrides?: Partial<SocialAccountEntity>): SocialAccountEntity {
  const e = new SocialAccountEntity();
  e.id = 10;
  e.uuid = SA_UUID;
  e.userId = 1;
  e.provider = 'google';
  e.providerId = 'google-provider-id-123';
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-01-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

// ─────────────────────────────────────────────────────────────────────────────

describe('UserMapper', () => {
  describe('Given a UserEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a UserAggregate with all fields mapped', () => {
        const entity = buildUserEntity();
        const model = UserMapper.toDomain(entity);

        expect(model).toBeInstanceOf(UserAggregate);
        expect(model.id).toBe(entity.id);
        expect(model.uuid).toBe(entity.uuid);
        expect(model.email).toBe(entity.email);
        expect(model.username).toBe(entity.username);
        expect(model.passwordHash).toBe(entity.passwordHash);
        expect(model.status.toString()).toBe(entity.status);
        expect(model.emailVerifiedAt).toEqual(entity.emailVerifiedAt);
        expect(model.createdWith).toBe(entity.createdWith);
        expect(model.accountType).toBe(entity.accountType);
        expect(model.archivedAt).toBeNull();
      });
    });

    describe('When toDomain is called with null passwordHash', () => {
      it('Then the model passwordHash is null', () => {
        const entity = buildUserEntity({ passwordHash: null });
        const model = UserMapper.toDomain(entity);
        expect(model.passwordHash).toBeNull();
      });
    });
  });

  describe('Given a UserAggregate with an id', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a Partial<UserEntity> including the id', () => {
        const entity = buildUserEntity();
        const model = UserMapper.toDomain(entity);
        const result = UserMapper.toEntity(model);

        expect(result.id).toBe(1);
        expect(result.email).toBe(entity.email);
        expect(result.username).toBe(entity.username);
        expect(result.status).toBe(entity.status);
        expect(result.createdWith).toBe(entity.createdWith);
        expect(result.accountType).toBe(entity.accountType);
      });
    });
  });

  describe('Given a UserAggregate without an id (new user)', () => {
    describe('When toEntity is called', () => {
      it('Then the id field is omitted from the result', () => {
        const aggregate = UserAggregate.create({
          email: 'new@example.com',
          username: 'newuser',
          passwordHash: '$2b$hash',
        });
        const result = UserMapper.toEntity(aggregate);
        expect(result.id).toBeUndefined();
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SocialAccountMapper', () => {
  describe('Given a SocialAccountEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a SocialAccountModel with all fields mapped', () => {
        const entity = buildSocialAccountEntity();
        const model = SocialAccountMapper.toDomain(entity);

        expect(model).toBeInstanceOf(SocialAccountModel);
        expect(model.id).toBe(entity.id);
        expect(model.uuid).toBe(entity.uuid);
        expect(model.userId).toBe(entity.userId);
        expect(model.provider).toBe(entity.provider);
        expect(model.providerId).toBe(entity.providerId);
      });
    });

    describe('When toDomain is called for different providers', () => {
      it('Then it correctly maps a Facebook social account', () => {
        const entity = buildSocialAccountEntity({ provider: 'facebook', providerId: 'fb-123' });
        const model = SocialAccountMapper.toDomain(entity);
        expect(model.provider).toBe('facebook');
        expect(model.providerId).toBe('fb-123');
      });
    });
  });
});
