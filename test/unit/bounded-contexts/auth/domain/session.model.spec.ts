import { SessionModel } from '@auth/domain/models/session.model';
import { SessionCreatedEvent } from '@auth/domain/events/session-created.event';

describe('SessionModel', () => {
  describe('create', () => {
    it('should create a session with valid data', () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const session = SessionModel.create({
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
      });

      expect(session.userId).toBe(1);
      expect(session.tokenHash).toBe('hash123');
      expect(session.expiresAt).toEqual(expiresAt);
      expect(session.uuid).toBeDefined();
      expect(session.isValid()).toBe(true);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute a session from persisted data', () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const session = SessionModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      });

      expect(session.id).toBe(1);
      expect(session.uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(session.userId).toBe(1);
    });
  });

  describe('isValid', () => {
    it('should return true for valid session', () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const session = SessionModel.create({
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
      });

      expect(session.isValid()).toBe(true);
    });

    it('should return false for expired session', () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1); // Yesterday

      const session = SessionModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      });

      expect(session.isValid()).toBe(false);
      expect(session.isExpired()).toBe(true);
    });

    it('should return false for archived session', () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const session = SessionModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: new Date(),
      });

      expect(session.isValid()).toBe(false);
      expect(session.isArchived()).toBe(true);
    });
  });

  describe('Domain Events', () => {
    it('should emit SessionCreatedEvent when created', () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const session = SessionModel.create({
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
      });

      const events = session.getUncommittedEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(SessionCreatedEvent);
      const event = events[0] as SessionCreatedEvent;
      expect(event.sessionUuid).toBe(session.uuid);
      expect(event.userId).toBe(1);
    });

    it('should NOT emit events when reconstituted from database', () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const session = SessionModel.reconstitute({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      });

      const events = session.getUncommittedEvents();

      expect(events).toHaveLength(0);
    });

    it('should clear events after commit()', () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const session = SessionModel.create({
        userId: 1,
        tokenHash: 'hash123',
        expiresAt,
      });

      expect(session.getUncommittedEvents()).toHaveLength(1);

      session.commit();

      expect(session.getUncommittedEvents()).toHaveLength(0);
    });
  });
});
