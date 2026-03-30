import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { UserCreatedFromSocialEvent } from '@user/domain/events/user-created-from-social.event';
import { UserPasswordUpdatedEvent } from '@user/domain/events/user-password-updated.event';

describe('User domain exceptions', () => {
  describe('Given UserNotFoundException', () => {
    describe('When instantiated with an identifier', () => {
      it('Then it has the correct error code and includes the identifier in the message', () => {
        const ex = new UserNotFoundException('user-uuid-123');
        expect(ex.errorCode).toBe('USER_NOT_FOUND');
        expect(ex.message).toContain('user-uuid-123');
        expect(ex.message).toContain('User');
      });
    });
  });
});

describe('User domain events', () => {
  describe('Given UserCreatedFromSocialEvent', () => {
    describe('When instantiated with all arguments', () => {
      it('Then it carries the correct payload and occurredOn from DomainEvent', () => {
        const before = new Date();
        const event = new UserCreatedFromSocialEvent(
          'user-uuid-1',
          'user@example.com',
          'google',
        );
        const after = new Date();

        expect(event.userUUID).toBe('user-uuid-1');
        expect(event.email).toBe('user@example.com');
        expect(event.provider).toBe('google');
        expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime() + 5);
        expect(event.eventName).toBe('UserCreatedFromSocialEvent');
      });
    });
  });

  describe('Given UserPasswordUpdatedEvent', () => {
    describe('When instantiated with a user UUID', () => {
      it('Then it carries the correct payload and occurredOn from DomainEvent', () => {
        const before = new Date();
        const event = new UserPasswordUpdatedEvent('user-uuid-3');
        const after = new Date();

        expect(event.userUUID).toBe('user-uuid-3');
        expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime() + 5);
        expect(event.eventName).toBe('UserPasswordUpdatedEvent');
      });
    });
  });
});
