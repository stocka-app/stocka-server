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
      it('Then it carries the correct payload', () => {
        const occurredOn = new Date('2024-06-15T10:00:00Z');
        const event = new UserCreatedFromSocialEvent(
          'user-uuid-1',
          'user@example.com',
          'google',
          occurredOn,
        );

        expect(event.userUUID).toBe('user-uuid-1');
        expect(event.email).toBe('user@example.com');
        expect(event.provider).toBe('google');
        expect(event.occurredOn).toEqual(occurredOn);
      });
    });

    describe('When instantiated without occurredOn', () => {
      it('Then occurredOn defaults to approximately now', () => {
        const before = new Date();
        const event = new UserCreatedFromSocialEvent('user-uuid-2', 'a@b.com', 'apple');
        const after = new Date();

        expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime() + 5);
      });
    });
  });

  describe('Given UserPasswordUpdatedEvent', () => {
    describe('When instantiated with all arguments', () => {
      it('Then it carries the correct payload', () => {
        const occurredOn = new Date('2024-06-15T12:00:00Z');
        const event = new UserPasswordUpdatedEvent('user-uuid-3', occurredOn);

        expect(event.userUUID).toBe('user-uuid-3');
        expect(event.occurredOn).toEqual(occurredOn);
      });
    });

    describe('When instantiated without occurredOn', () => {
      it('Then occurredOn defaults to approximately now', () => {
        const before = new Date();
        const event = new UserPasswordUpdatedEvent('user-uuid-4');
        const after = new Date();

        expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime() + 5);
      });
    });
  });
});
