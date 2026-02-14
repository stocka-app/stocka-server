import { PasswordResetTokenModel } from '@auth/domain/models/password-reset-token.model';
import { PasswordResetRequestedEvent } from '@auth/domain/events/password-reset-requested.event';
import { PasswordResetCompletedEvent } from '@auth/domain/events/password-reset-completed.event';

describe('PasswordResetTokenModel', () => {
  describe('create', () => {
    it('should create a password reset token with valid data', () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const token = PasswordResetTokenModel.create({
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
        email: 'test@example.com',
      });

      expect(token.userId).toBe(1);
      expect(token.tokenHash).toBe('hash123');
      expect(token.expiresAt).toEqual(expiresAt);
      expect(token.uuid).toBeDefined();
      expect(token.isValid()).toBe(true);
      expect(token.isUsed()).toBe(false);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute a token from persisted data', () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const token = PasswordResetTokenModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
        usedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      });

      expect(token.id).toBe(1);
      expect(token.uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(token.userId).toBe(1);
    });
  });

  describe('isValid', () => {
    it('should return true for valid token', () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const token = PasswordResetTokenModel.create({
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
        email: 'test@example.com',
      });

      expect(token.isValid()).toBe(true);
    });

    it('should return false for expired token', () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() - 1); // 1 hour ago

      const token = PasswordResetTokenModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
        usedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      });

      expect(token.isValid()).toBe(false);
      expect(token.isExpired()).toBe(true);
    });

    it('should return false for used token', () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const token = PasswordResetTokenModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
        usedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      });

      expect(token.isValid()).toBe(false);
      expect(token.isUsed()).toBe(true);
    });

    it('should return false for archived token', () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const token = PasswordResetTokenModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
        usedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: new Date(),
      });

      expect(token.isValid()).toBe(false);
      expect(token.isArchived()).toBe(true);
    });
  });

  describe('markAsUsed', () => {
    it('should mark the token as used', () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const token = PasswordResetTokenModel.create({
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
        email: 'test@example.com',
      });

      expect(token.isUsed()).toBe(false);

      token.markAsUsed();

      expect(token.isUsed()).toBe(true);
      expect(token.usedAt).not.toBeNull();
    });
  });

  describe('Domain Events', () => {
    it('should emit PasswordResetRequestedEvent when created', () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const token = PasswordResetTokenModel.create({
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
        email: 'test@example.com',
      });

      const events = token.getUncommittedEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(PasswordResetRequestedEvent);
      const event = events[0] as PasswordResetRequestedEvent;
      expect(event.userId).toBe(1);
      expect(event.email).toBe('test@example.com');
    });

    it('should NOT emit events when reconstituted from database', () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const token = PasswordResetTokenModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
        usedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      });

      const events = token.getUncommittedEvents();

      expect(events).toHaveLength(0);
    });

    it('should emit PasswordResetCompletedEvent when marked as used', () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const token = PasswordResetTokenModel.create({
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
        email: 'test@example.com',
      });
      token.commit(); // Clear creation event

      token.markAsUsed();

      const events = token.getUncommittedEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(PasswordResetCompletedEvent);
      const event = events[0] as PasswordResetCompletedEvent;
      expect(event.userId).toBe(1);
    });

    it('should clear events after commit()', () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const token = PasswordResetTokenModel.create({
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
        email: 'test@example.com',
      });

      expect(token.getUncommittedEvents()).toHaveLength(1);

      token.commit();

      expect(token.getUncommittedEvents()).toHaveLength(0);
    });
  });
});
