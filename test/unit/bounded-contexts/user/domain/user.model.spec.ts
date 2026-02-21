import { AccountType, UserModel } from '@user/domain/models/user.model';
import { UserCreatedEvent } from '@user/domain/events/user-created.event';
import { UserCreatedFromSocialEvent } from '@user/domain/events/user-created-from-social.event';
import { UserPasswordUpdatedEvent } from '@user/domain/events/user-password-updated.event';
import { ProviderLinkedEvent } from '@user/domain/events/provider-linked.event';
import { AccountBecameFlexibleEvent } from '@user/domain/events/account-became-flexible.event';

describe('UserModel', () => {
  describe('create', () => {
    it('should create a user with valid data', () => {
      const user = UserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
      });

      expect(user.email).toBe('test@example.com');
      expect(user.username).toBe('testuser');
      expect(user.passwordHash).toBe('hashedpassword');
      expect(user.uuid).toBeDefined();
      expect(user.id).toBeUndefined();
      expect(user.isArchived()).toBe(false);
    });

    it('should create a user without password (social auth)', () => {
      const user = UserModel.create({
        email: 'social@example.com',
        username: 'socialuser',
        passwordHash: null,
      });

      expect(user.hasPassword()).toBe(false);
      expect(user.passwordHash).toBeNull();
    });

    it('should throw an error for invalid email', () => {
      expect(() =>
        UserModel.create({
          email: 'invalid-email',
          username: 'testuser',
          passwordHash: 'hashedpassword',
        }),
      ).toThrow();
    });

    it('should throw an error for invalid username (too short)', () => {
      expect(() =>
        UserModel.create({
          email: 'test@example.com',
          username: 'ab',
          passwordHash: 'hashedpassword',
        }),
      ).toThrow();
    });

    it('should throw an error for invalid username (special chars)', () => {
      expect(() =>
        UserModel.create({
          email: 'test@example.com',
          username: 'test@user!',
          passwordHash: 'hashedpassword',
        }),
      ).toThrow();
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute a user from persisted data', () => {
      const user = UserModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        archivedAt: null,
      });

      expect(user.id).toBe(1);
      expect(user.uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(user.email).toBe('test@example.com');
    });
  });

  describe('hasPassword', () => {
    it('should return true when user has password', () => {
      const user = UserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
      });

      expect(user.hasPassword()).toBe(true);
    });

    it('should return false when user has no password', () => {
      const user = UserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: null,
      });

      expect(user.hasPassword()).toBe(false);
    });
  });

  describe('archive and restore', () => {
    it('should archive a user', () => {
      const user = UserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
      });

      expect(user.isArchived()).toBe(false);

      user.archive();

      expect(user.isArchived()).toBe(true);
      expect(user.archivedAt).not.toBeNull();
    });

    it('should restore an archived user', () => {
      const user = UserModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        archivedAt: new Date('2024-06-01'),
      });

      expect(user.isArchived()).toBe(true);

      user.restore();

      expect(user.isArchived()).toBe(false);
      expect(user.archivedAt).toBeNull();
    });
  });

  describe('updatePasswordHash', () => {
    it('should update the password hash', () => {
      const user = UserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'oldhash',
      });

      // Wait a bit to ensure updatedAt changes
      user.updatePasswordHash('newhash');

      expect(user.passwordHash).toBe('newhash');
    });
  });

  describe('Domain Events', () => {
    it('should emit UserCreatedEvent when created via create()', () => {
      const user = UserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash123',
      });

      const events = user.getUncommittedEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserCreatedEvent);
      const event = events[0] as UserCreatedEvent;
      expect(event.userUUID).toBe(user.uuid);
      expect(event.email).toBe('test@example.com');
      expect(event.username).toBe('testuser');
    });

    it('should emit UserCreatedFromSocialEvent when created via createFromSocial()', () => {
      const user = UserModel.createFromSocial({
        email: 'social@example.com',
        username: 'socialuser',
        passwordHash: null,
        provider: 'google',
      });

      const events = user.getUncommittedEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserCreatedFromSocialEvent);
      const event = events[0] as UserCreatedFromSocialEvent;
      expect(event.userUUID).toBe(user.uuid);
      expect(event.email).toBe('social@example.com');
      expect(event.provider).toBe('google');
    });

    it('should NOT emit events when reconstituted from database', () => {
      const user = UserModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash123',
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      });

      const events = user.getUncommittedEvents();

      expect(events).toHaveLength(0);
    });

    it('should emit UserPasswordUpdatedEvent when password is updated', () => {
      const user = UserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'oldHash',
      });
      user.commit(); // Clear creation event

      user.updatePasswordHash('newHash');

      const events = user.getUncommittedEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserPasswordUpdatedEvent);
      const event = events[0] as UserPasswordUpdatedEvent;
      expect(event.userUUID).toBe(user.uuid);
    });

    it('should clear events after commit()', () => {
      const user = UserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash123',
      });

      expect(user.getUncommittedEvents()).toHaveLength(1);

      user.commit();

      expect(user.getUncommittedEvents()).toHaveLength(0);
    });
  });

  describe('accountType and createdWith', () => {
    it('should default to manual accountType and email createdWith for create()', () => {
      const user = UserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash',
      });

      expect(user.accountType).toBe(AccountType.MANUAL);
      expect(user.createdWith).toBe('email');
    });

    it('should set social accountType and provider createdWith for createFromSocial()', () => {
      const user = UserModel.createFromSocial({
        email: 'social@example.com',
        username: 'socialuser',
        passwordHash: null,
        provider: 'google',
      });

      expect(user.accountType).toBe(AccountType.SOCIAL);
      expect(user.createdWith).toBe('google');
    });

    it('should restore accountType and createdWith on reconstitute()', () => {
      const user = UserModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash',
        createdWith: 'email',
        accountType: AccountType.FLEXIBLE,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      });

      expect(user.accountType).toBe(AccountType.FLEXIBLE);
      expect(user.createdWith).toBe('email');
    });
  });

  describe('becomeFlexible', () => {
    it('should set accountType to flexible and emit events for a manual account', () => {
      const user = UserModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash',
        accountType: AccountType.MANUAL,
        createdWith: 'email',
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      });

      user.becomeFlexible('google', false);

      expect(user.accountType).toBe(AccountType.FLEXIBLE);

      const events = user.getUncommittedEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(ProviderLinkedEvent);
      expect(events[1]).toBeInstanceOf(AccountBecameFlexibleEvent);

      const linked = events[0] as ProviderLinkedEvent;
      expect(linked.provider).toBe('google');
      expect(linked.userUUID).toBe(user.uuid);
      expect(linked.isFlexiblePending).toBe(false);

      const flexible = events[1] as AccountBecameFlexibleEvent;
      expect(flexible.trigger).toBe('oauth_link');
      expect(flexible.userUUID).toBe(user.uuid);
    });

    it('should set isFlexiblePending to true when account is pending verification', () => {
      const user = UserModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash',
        accountType: AccountType.MANUAL,
        status: 'pending_verification',
        createdWith: 'email',
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      });

      user.becomeFlexible('google', true);

      const events = user.getUncommittedEvents();
      const linked = events[0] as ProviderLinkedEvent;
      expect(linked.isFlexiblePending).toBe(true);
    });

    it('should emit only ProviderLinkedEvent if already flexible', () => {
      const user = UserModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash',
        accountType: AccountType.FLEXIBLE,
        createdWith: 'email',
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      });

      user.becomeFlexible('facebook', false);

      const events = user.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ProviderLinkedEvent);
    });
  });

  describe('setPasswordAndBecomeFlexible', () => {
    it('should set password hash, change accountType to flexible, and emit AccountBecameFlexibleEvent with trigger password_set', () => {
      const user = UserModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        email: 'social@example.com',
        username: 'socialuser',
        passwordHash: null,
        accountType: AccountType.SOCIAL,
        createdWith: 'google',
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      });

      user.setPasswordAndBecomeFlexible('newhashedpassword');

      expect(user.accountType).toBe(AccountType.FLEXIBLE);
      expect(user.passwordHash).toBe('newhashedpassword');

      const events = user.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(AccountBecameFlexibleEvent);

      const flexible = events[0] as AccountBecameFlexibleEvent;
      expect(flexible.trigger).toBe('password_set');
      expect(flexible.userUUID).toBe(user.uuid);
    });
  });
});
