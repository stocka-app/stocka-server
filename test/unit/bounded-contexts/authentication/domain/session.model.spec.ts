import { SessionAggregate } from '@user/account/session/domain/session.aggregate';
import { SessionCreatedEvent } from '@user/account/session/domain/events/session-created.event';

describe('SessionAggregate', () => {
  describe('Given valid props to create a new session', () => {
    describe('When create is called', () => {
      it('Then it returns a SessionAggregate with the given props', () => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const session = SessionAggregate.create({
          accountId: 1,
          tokenHash: 'hash123',
          expiresAt,
        });

        expect(session.accountId).toBe(1);
        expect(session.tokenHash).toBe('hash123');
        expect(session.expiresAt).toEqual(expiresAt);
        expect(session.uuid).toBeDefined();
        expect(session.isValid()).toBe(true);
      });

      it('Then it emits a SessionCreatedEvent', () => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const session = SessionAggregate.create({
          accountId: 1,
          tokenHash: 'hash123',
          expiresAt,
        });

        const events = session.getUncommittedEvents();

        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(SessionCreatedEvent);
        const event = events[0] as SessionCreatedEvent;
        expect(event.sessionUUID).toBe(session.uuid);
        expect(event.accountId).toBe(1);
      });
    });
  });

  describe('Given persisted session data to reconstitute', () => {
    describe('When reconstitute is called', () => {
      it('Then it returns a SessionAggregate with all persisted fields', () => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const session = SessionAggregate.reconstitute({
          id: 1,
          uuid: '550e8400-e29b-41d4-a716-446655440000',
          accountId: 1,
          tokenHash: 'hash123',
          expiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        });

        expect(session.id).toBe(1);
        expect(session.uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(session.accountId).toBe(1);
      });

      it('Then it does NOT emit any domain events', () => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const session = SessionAggregate.reconstitute({
          id: 1,
          uuid: '550e8400-e29b-41d4-a716-446655440000',
          accountId: 1,
          tokenHash: 'hash123',
          expiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        });

        expect(session.getUncommittedEvents()).toHaveLength(0);
      });
    });
  });

  describe('Given a session that has not expired and is not archived', () => {
    describe('When isValid is called', () => {
      it('Then it returns true', () => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const session = SessionAggregate.create({
          accountId: 1,
          tokenHash: 'hash123',
          expiresAt,
        });

        expect(session.isValid()).toBe(true);
      });
    });
  });

  describe('Given a session whose expiry date is in the past', () => {
    describe('When isValid and isExpired are called', () => {
      it('Then isValid returns false and isExpired returns true', () => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() - 1);

        const session = SessionAggregate.reconstitute({
          id: 1,
          uuid: '550e8400-e29b-41d4-a716-446655440000',
          accountId: 1,
          tokenHash: 'hash123',
          expiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        });

        expect(session.isValid()).toBe(false);
        expect(session.isExpired()).toBe(true);
      });
    });
  });

  describe('Given a session that has been archived', () => {
    describe('When isValid and isArchived are called', () => {
      it('Then isValid returns false and isArchived returns true', () => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const session = SessionAggregate.reconstitute({
          id: 1,
          uuid: '550e8400-e29b-41d4-a716-446655440000',
          accountId: 1,
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
  });

  describe('Given a session with a pending SessionCreatedEvent', () => {
    describe('When commit is called', () => {
      it('Then the uncommitted events list is cleared', () => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const session = SessionAggregate.create({
          accountId: 1,
          tokenHash: 'hash123',
          expiresAt,
        });

        expect(session.getUncommittedEvents()).toHaveLength(1);

        session.commit();

        expect(session.getUncommittedEvents()).toHaveLength(0);
      });
    });
  });
});
