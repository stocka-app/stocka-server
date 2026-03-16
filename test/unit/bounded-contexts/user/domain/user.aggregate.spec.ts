import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { SocialAccountModel } from '@user/domain/models/social-account.model';
import { UserCreatedEvent } from '@user/domain/events/user-created.event';

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildPersistedUser(overrides?: Partial<Parameters<typeof UserAggregate.reconstitute>[0]>): UserAggregate {
  return UserAggregate.reconstitute({
    id: 1,
    uuid: '550e8400-e29b-41d4-a716-446655440000',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    archivedAt: null,
    ...overrides,
  });
}

// ── UserAggregate (pure anchor) ────────────────────────────────────────────────

describe('UserAggregate', () => {
  describe('Given UserAggregate.create() is called', () => {
    describe('When a new user is created', () => {
      it('Then the user has a uuid and no id (not yet persisted)', () => {
        const user = UserAggregate.create();

        expect(user.uuid).toBeDefined();
        expect(user.id).toBeUndefined();
      });

      it('Then the user is not archived', () => {
        const user = UserAggregate.create();

        expect(user.isArchived()).toBe(false);
      });

      it('Then exactly one UserCreatedEvent is emitted', () => {
        const user = UserAggregate.create();
        const events = user.getUncommittedEvents();

        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(UserCreatedEvent);
      });

      it('Then the UserCreatedEvent carries the user uuid', () => {
        const user = UserAggregate.create();
        const event = user.getUncommittedEvents()[0] as UserCreatedEvent;

        expect(event.userUUID).toBe(user.uuid);
      });
    });
  });

  describe('Given UserAggregate.reconstitute() is called with persisted data', () => {
    describe('When the aggregate is hydrated from storage', () => {
      it('Then id and uuid are preserved', () => {
        const user = buildPersistedUser();

        expect(user.id).toBe(1);
        expect(user.uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
      });

      it('Then no domain events are emitted', () => {
        const user = buildPersistedUser();

        expect(user.getUncommittedEvents()).toHaveLength(0);
      });

      it('Then archivedAt is null for an active user', () => {
        const user = buildPersistedUser({ archivedAt: null });

        expect(user.isArchived()).toBe(false);
        expect(user.archivedAt).toBeNull();
      });
    });
  });

  describe('Given an active user', () => {
    describe('When archive() is called', () => {
      it('Then the user becomes archived', () => {
        const user = buildPersistedUser();

        user.archive();

        expect(user.isArchived()).toBe(true);
        expect(user.archivedAt).not.toBeNull();
      });
    });
  });

  describe('Given an archived user', () => {
    describe('When restore() is called', () => {
      it('Then the user becomes active again', () => {
        const user = buildPersistedUser({ archivedAt: new Date('2024-06-01') });

        expect(user.isArchived()).toBe(true);

        user.restore();

        expect(user.isArchived()).toBe(false);
        expect(user.archivedAt).toBeNull();
      });
    });
  });

  describe('Given events have been committed', () => {
    describe('When commit() is called', () => {
      it('Then all uncommitted events are cleared', () => {
        const user = UserAggregate.create();

        expect(user.getUncommittedEvents()).toHaveLength(1);

        user.commit();

        expect(user.getUncommittedEvents()).toHaveLength(0);
      });
    });
  });
});

// ── CredentialAccountModel ─────────────────────────────────────────────────────

describe('CredentialAccountModel', () => {
  describe('Given CredentialAccountModel.create() is called with email and passwordHash', () => {
    describe('When a new credential is created', () => {
      it('Then email and passwordHash are stored', () => {
        const credential = CredentialAccountModel.create({
          accountId: 1,
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          createdWith: 'email',
        });

        expect(credential.email).toBe('test@example.com');
        expect(credential.passwordHash).toBe('hashedpassword');
      });

      it('Then the credential is in pending_verification status', () => {
        const credential = CredentialAccountModel.create({
          accountId: 1,
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          createdWith: 'email',
        });

        expect(credential.isPendingVerification()).toBe(true);
      });

      it('Then hasPassword() returns true when passwordHash is provided', () => {
        const credential = CredentialAccountModel.create({
          accountId: 1,
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          createdWith: 'email',
        });

        expect(credential.hasPassword()).toBe(true);
      });

      it('Then hasPassword() returns false when passwordHash is null (social auth)', () => {
        const credential = CredentialAccountModel.create({
          accountId: 1,
          email: 'social@example.com',
          passwordHash: null,
          createdWith: 'google',
        });

        expect(credential.hasPassword()).toBe(false);
      });
    });
  });

  describe('Given CredentialAccountModel.createFromSocial() is called', () => {
    describe('When a social credential is created', () => {
      it('Then email is stored and passwordHash is null', () => {
        const credential = CredentialAccountModel.createFromSocial({
          accountId: 1,
          email: 'social@example.com',
          provider: 'google',
        });

        expect(credential.email).toBe('social@example.com');
        expect(credential.passwordHash).toBeNull();
        expect(credential.createdWith).toBe('google');
      });

      it('Then the credential is email verified by provider', () => {
        const credential = CredentialAccountModel.createFromSocial({
          accountId: 1,
          email: 'social@example.com',
          provider: 'google',
        });

        expect(credential.isEmailVerified()).toBe(true);
      });
    });
  });

  describe('Given a reconstituted credential', () => {
    describe('When updatePasswordHash() is called', () => {
      it('Then the new password hash is set', () => {
        const credential = CredentialAccountModel.reconstitute({
          id: 1,
          uuid: '660f9511-f30c-4ae5-b827-557766551111',
          accountId: 1,
          email: 'test@example.com',
          passwordHash: 'oldhash',
          status: 'active',
          emailVerifiedAt: new Date('2024-01-01'),
          verificationBlockedUntil: null,
          createdWith: 'email',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          archivedAt: null,
        });

        credential.updatePasswordHash('newhash');

        expect(credential.passwordHash).toBe('newhash');
      });
    });

    describe('When verifyEmail() is called', () => {
      it('Then the credential becomes active and email is marked verified', () => {
        const credential = CredentialAccountModel.reconstitute({
          id: 1,
          uuid: '660f9511-f30c-4ae5-b827-557766551111',
          accountId: 1,
          email: 'test@example.com',
          passwordHash: 'hash',
          status: 'pending_verification',
          emailVerifiedAt: null,
          verificationBlockedUntil: null,
          createdWith: 'email',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          archivedAt: null,
        });

        credential.verifyEmail();

        expect(credential.isEmailVerified()).toBe(true);
        expect(credential.isPendingVerification()).toBe(false);
      });
    });

    describe('When blockVerification() is called then unblockVerification()', () => {
      it('Then verificationBlockedUntil is set then cleared', () => {
        const credential = CredentialAccountModel.reconstitute({
          id: 1,
          uuid: '660f9511-f30c-4ae5-b827-557766551111',
          accountId: 1,
          email: 'test@example.com',
          passwordHash: 'hash',
          status: 'pending_verification',
          emailVerifiedAt: null,
          verificationBlockedUntil: null,
          createdWith: 'email',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          archivedAt: null,
        });

        const blockUntil = new Date(Date.now() + 60000);
        credential.blockVerification(blockUntil);
        expect(credential.verificationBlockedUntil).toEqual(blockUntil);

        credential.unblockVerification();
        expect(credential.verificationBlockedUntil).toBeNull();
      });
    });

    describe('When emailVerifiedAt is set on reconstitute', () => {
      it('Then isEmailVerified() returns true', () => {
        const verifiedDate = new Date('2024-06-01T12:00:00Z');
        const credential = CredentialAccountModel.reconstitute({
          id: 1,
          uuid: '660f9511-f30c-4ae5-b827-557766551111',
          accountId: 1,
          email: 'test@example.com',
          passwordHash: 'hash',
          status: 'active',
          emailVerifiedAt: verifiedDate,
          verificationBlockedUntil: null,
          createdWith: 'email',
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        });

        expect(credential.isEmailVerified()).toBe(true);
        expect(credential.emailVerifiedAt).toEqual(verifiedDate);
      });
    });
  });
});

// ── SocialAccountModel ─────────────────────────────────────────────────────────

describe('SocialAccountModel', () => {
  describe('Given props without createdAt or updatedAt', () => {
    it('Then it defaults createdAt and updatedAt to current time', () => {
      const before = Date.now();
      const account = SocialAccountModel.create({
        userId: 1,
        provider: 'google',
        providerId: 'google-id-123',
      });
      const after = Date.now();

      expect(account.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(account.createdAt.getTime()).toBeLessThanOrEqual(after);
      expect(account.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    });
  });
});
