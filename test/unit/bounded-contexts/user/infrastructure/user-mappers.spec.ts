import { UserMapper } from '@user/infrastructure/persistence/mappers/user.mapper';
import { SocialAccountMapper } from '@user/infrastructure/persistence/mappers/social-account.mapper';
import { CredentialAccountMapper } from '@user/account/infrastructure/mappers/credential-account.mapper';
import { AccountMapper } from '@user/account/infrastructure/mappers/account.mapper';
import { SocialAccountMapper as AccountSocialAccountMapper } from '@user/account/infrastructure/mappers/social-account.mapper';
import { ProfileMapper } from '@user/profile/infrastructure/mappers/profile.mapper';
import { PersonalProfileMapper } from '@user/profile/infrastructure/mappers/personal-profile.mapper';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { SocialAccountModel } from '@user/account/domain/models/social-account.model';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { UserEntity } from '@user/infrastructure/persistence/entities/user.entity';
import { SocialAccountEntity } from '@user/account/infrastructure/entities/social-account.entity';
import { CredentialAccountEntity } from '@user/account/infrastructure/entities/credential-account.entity';
import { AccountEntity } from '@user/account/infrastructure/entities/account.entity';
import { ProfileEntity } from '@user/profile/infrastructure/entities/profile.entity';
import { PersonalProfileEntity } from '@user/profile/infrastructure/entities/personal-profile.entity';

// ── Builders ───────────────────────────────────────────────────────────────────

const USER_UUID = '550e8400-e29b-41d4-a716-446655440010';
const CRED_UUID = '550e8400-e29b-41d4-a716-446655440012';
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

// ── CredentialAccountMapper ────────────────────────────────────────────────────

function buildCredentialAccountEntity(
  overrides?: Partial<CredentialAccountEntity>,
): CredentialAccountEntity {
  const e = new CredentialAccountEntity();
  e.id = 5;
  e.uuid = CRED_UUID;
  e.accountId = 1;
  e.email = 'cred@example.com';
  e.passwordHash = 'hashed';
  e.status = 'active';
  e.emailVerifiedAt = new Date('2024-03-01');
  e.verificationBlockedUntil = null;
  e.createdWith = 'email';
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-02-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

describe('CredentialAccountMapper', () => {
  describe('Given a CredentialAccountEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a CredentialAccountModel with all fields mapped', () => {
        const entity = buildCredentialAccountEntity();
        const model = CredentialAccountMapper.toDomain(entity);

        expect(model).toBeInstanceOf(CredentialAccountModel);
        expect(model.id).toBe(entity.id);
        expect(model.uuid).toBe(entity.uuid);
        expect(model.email).toBe(entity.email);
        expect(model.passwordHash).toBe(entity.passwordHash);
        expect(model.emailVerifiedAt).toEqual(entity.emailVerifiedAt);
      });
    });
  });

  describe('Given a CredentialAccountModel with an id', () => {
    describe('When toEntity is called', () => {
      it('Then the entity includes the id field', () => {
        const entity = buildCredentialAccountEntity();
        const model = CredentialAccountMapper.toDomain(entity);
        const result = CredentialAccountMapper.toEntity(model);

        expect(result.id).toBe(5);
        expect(result.email).toBe('cred@example.com');
        expect(result.status).toBe('active');
      });
    });
  });

  describe('Given a new CredentialAccountModel without an id', () => {
    describe('When toEntity is called', () => {
      it('Then the id field is omitted from the result', () => {
        const model = CredentialAccountModel.create({
          accountId: 1,
          email: 'new@example.com',
          passwordHash: 'hash',
          createdWith: 'email',
        });
        const result = CredentialAccountMapper.toEntity(model);

        expect(result.id).toBeUndefined();
        expect(result.email).toBe('new@example.com');
      });
    });
  });
});

// ── AccountMapper (account sub-BC) ────────────────────────────────────────────

function buildAccountEntity(overrides?: Partial<AccountEntity>): AccountEntity {
  const e = new AccountEntity();
  e.id = 3;
  e.uuid = '550e8400-e29b-41d4-a716-446655440013';
  e.userId = 1;
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-02-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

describe('AccountMapper', () => {
  describe('Given an AccountEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns an AccountAggregate with all fields mapped', () => {
        const entity = buildAccountEntity();
        const model = AccountMapper.toDomain(entity);

        expect(model.id).toBe(3);
        expect(model.uuid).toBe('550e8400-e29b-41d4-a716-446655440013');
        expect(model.userId).toBe(1);
        expect(model.archivedAt).toBeNull();
      });
    });
  });

  describe('Given an AccountAggregate with an id', () => {
    describe('When toEntity is called', () => {
      it('Then the entity includes uuid and userId', () => {
        const entity = buildAccountEntity();
        const model = AccountMapper.toDomain(entity);
        const result = AccountMapper.toEntity(model);

        expect(result.uuid).toBe('550e8400-e29b-41d4-a716-446655440013');
        expect(result.userId).toBe(1);
      });
    });
  });
});

// ── SocialAccountMapper (account sub-BC) ──────────────────────────────────────

function buildAccountSocialAccountEntity(
  overrides?: Partial<SocialAccountEntity>,
): SocialAccountEntity {
  const e = new SocialAccountEntity();
  e.id = 20;
  e.uuid = '550e8400-e29b-41d4-a716-446655440014';
  e.accountId = 3;
  e.provider = 'google';
  e.providerId = 'google-123';
  e.providerEmail = 'social@gmail.com';
  e.linkedAt = new Date('2024-03-01');
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-02-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

describe('AccountSocialAccountMapper', () => {
  describe('Given a SocialAccountEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a SocialAccountModel with all fields mapped', () => {
        const entity = buildAccountSocialAccountEntity();
        const model = AccountSocialAccountMapper.toDomain(entity);

        expect(model).toBeInstanceOf(SocialAccountModel);
        expect(model.id).toBe(20);
        expect(model.accountId).toBe(3);
        expect(model.provider).toBe('google');
        expect(model.providerId).toBe('google-123');
        expect(model.providerEmail).toBe('social@gmail.com');
      });
    });
  });

  describe('Given a SocialAccountModel with an id', () => {
    describe('When toEntity is called', () => {
      it('Then the entity includes all fields', () => {
        const entity = buildAccountSocialAccountEntity();
        const model = AccountSocialAccountMapper.toDomain(entity);
        const result = AccountSocialAccountMapper.toEntity(model);

        expect(result.provider).toBe('google');
        expect(result.providerId).toBe('google-123');
        expect(result.accountId).toBe(3);
      });
    });
  });
});

// ── ProfileMapper ─────────────────────────────────────────────────────────────

function buildProfileEntity(overrides?: Partial<ProfileEntity>): ProfileEntity {
  const e = new ProfileEntity();
  e.id = 8;
  e.uuid = '550e8400-e29b-41d4-a716-446655440015';
  e.userId = 1;
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-02-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

describe('ProfileMapper', () => {
  describe('Given a ProfileEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a ProfileAggregate with all fields mapped', () => {
        const entity = buildProfileEntity();
        const model = ProfileMapper.toDomain(entity);

        expect(model.id).toBe(8);
        expect(model.uuid).toBe('550e8400-e29b-41d4-a716-446655440015');
        expect(model.userId).toBe(1);
        expect(model.archivedAt).toBeNull();
      });
    });
  });

  describe('Given a ProfileAggregate with an id', () => {
    describe('When toEntity is called', () => {
      it('Then the entity includes uuid and userId', () => {
        const entity = buildProfileEntity();
        const model = ProfileMapper.toDomain(entity);
        const result = ProfileMapper.toEntity(model);

        expect(result.uuid).toBe('550e8400-e29b-41d4-a716-446655440015');
        expect(result.userId).toBe(1);
      });
    });
  });
});

// ── PersonalProfileMapper ─────────────────────────────────────────────────────

function buildPersonalProfileEntity(
  overrides?: Partial<PersonalProfileEntity>,
): PersonalProfileEntity {
  const e = new PersonalProfileEntity();
  e.id = 11;
  e.uuid = '550e8400-e29b-41d4-a716-446655440016';
  e.profileId = 8;
  e.username = 'johndoe';
  e.displayName = 'John Doe';
  e.avatarUrl = null;
  e.locale = 'es';
  e.timezone = 'America/Mexico_City';
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-02-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

describe('PersonalProfileMapper', () => {
  describe('Given a PersonalProfileEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a PersonalProfileModel with all fields mapped', () => {
        const entity = buildPersonalProfileEntity();
        const model = PersonalProfileMapper.toDomain(entity);

        expect(model.id).toBe(11);
        expect(model.profileId).toBe(8);
        expect(model.username).toBe('johndoe');
        expect(model.displayName).toBe('John Doe');
        expect(model.avatarUrl).toBeNull();
        expect(model.locale).toBe('es');
        expect(model.timezone).toBe('America/Mexico_City');
      });
    });
  });

  describe('Given a PersonalProfileModel with an id', () => {
    describe('When toEntity is called', () => {
      it('Then the entity includes all profile fields', () => {
        const entity = buildPersonalProfileEntity();
        const model = PersonalProfileMapper.toDomain(entity);
        const result = PersonalProfileMapper.toEntity(model);

        expect(result.username).toBe('johndoe');
        expect(result.profileId).toBe(8);
        expect(result.locale).toBe('es');
        expect(result.timezone).toBe('America/Mexico_City');
      });
    });
  });
});

// ─── SocialProfileMapper ──────────────────────────────────────────────────────

import { SocialProfileMapper } from '@user/profile/infrastructure/mappers/social-profile.mapper';
import { SocialProfileEntity } from '@user/profile/infrastructure/entities/social-profile.entity';

function buildSocialProfileEntity(overrides?: Partial<SocialProfileEntity>): SocialProfileEntity {
  const e = new SocialProfileEntity();
  e.id = 1;
  e.uuid = '550e8400-e29b-41d4-a716-446655440200';
  e.profileId = 10;
  e.socialAccountUUID = '019538a0-0000-7000-8000-000000000099';
  e.provider = 'google';
  e.providerDisplayName = 'Roberto Medina';
  e.providerAvatarUrl = 'https://example.com/avatar.jpg';
  e.providerProfileUrl = null;
  e.givenName = 'Roberto';
  e.familyName = 'Medina';
  e.locale = 'es';
  e.emailVerified = true;
  e.jobTitle = null;
  e.rawData = { sub: 'google-sub-001' };
  e.syncedAt = new Date('2024-06-01');
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-01-01');
  e.archivedAt = null;
  return Object.assign(e, overrides);
}

describe('SocialProfileMapper', () => {
  describe('Given a SocialProfileEntity', () => {
    describe('When toDomain() is called', () => {
      it('Then it returns a SocialProfileModel with all fields mapped', () => {
        const entity = buildSocialProfileEntity();

        const model = SocialProfileMapper.toDomain(entity);

        expect(model.id).toBe(1);
        expect(model.uuid).toBe('550e8400-e29b-41d4-a716-446655440200');
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
        expect(model.syncedAt).toEqual(new Date('2024-06-01'));
      });
    });

    describe('When toDomain() is called with null emailVerified and rawData', () => {
      it('Then it applies the null-safe defaults (false and {})', () => {
        const entity = buildSocialProfileEntity({ emailVerified: null, rawData: null });

        const model = SocialProfileMapper.toDomain(entity);

        expect(model.emailVerified).toBe(false);
        expect(model.rawData).toEqual({});
      });
    });
  });

  describe('Given a SocialProfileModel', () => {
    describe('When toEntity() is called on a newly-created model (no id)', () => {
      it('Then it returns a partial entity without id', () => {
        const model = SocialProfileMapper.toDomain(buildSocialProfileEntity());

        // Simulate a new model by calling create (id will be undefined)
        const newModel = Object.create(model) as typeof model;

        const entity = SocialProfileMapper.toEntity(newModel);

        expect(entity.profileId).toBe(10);
        expect(entity.socialAccountUUID).toBe('019538a0-0000-7000-8000-000000000099');
        expect(entity.provider).toBe('google');
        expect(entity.providerDisplayName).toBe('Roberto Medina');
        expect(entity.givenName).toBe('Roberto');
        expect(entity.familyName).toBe('Medina');
        expect(entity.locale).toBe('es');
        expect(entity.emailVerified).toBe(true);
        expect(entity.rawData).toEqual({ sub: 'google-sub-001' });
      });
    });

    describe('When toEntity() is called on a reconstituted model (with id)', () => {
      it('Then the entity includes the id', () => {
        const model = SocialProfileMapper.toDomain(buildSocialProfileEntity());

        const entity = SocialProfileMapper.toEntity(model);

        expect(entity.id).toBe(1);
      });
    });
  });
});
