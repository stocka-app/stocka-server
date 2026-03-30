import { UserCreatedEventHandler } from '@user/application/event-handlers/user-created.event-handler';
import { UserCreatedEvent } from '@user/domain/events/user-created.event';
import { UserPasswordUpdatedEventHandler } from '@user/application/event-handlers/user-password-updated.event-handler';
import { UserPasswordUpdatedEvent } from '@user/domain/events/user-password-updated.event';
import { UserCreatedFromSocialEventHandler } from '@user/application/event-handlers/user-created-from-social.event-handler';
import { UserCreatedFromSocialEvent } from '@user/domain/events/user-created-from-social.event';

describe('UserCreatedEventHandler', () => {
  let handler: UserCreatedEventHandler;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    handler = new UserCreatedEventHandler();
    logSpy = jest.spyOn((handler as any).logger, 'log').mockImplementation();
  });

  describe('Given a UserCreatedEvent', () => {
    const event = new UserCreatedEvent('user-uuid-1', 'test@example.com', 'john_doe');

    describe('When handle is called', () => {
      it('Then it logs the creation with UUID, email, and username', () => {
        handler.handle(event);

        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('user-uuid-1'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('john_doe'),
        );
      });
    });
  });
});

describe('UserPasswordUpdatedEventHandler', () => {
  let handler: UserPasswordUpdatedEventHandler;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    handler = new UserPasswordUpdatedEventHandler();
    logSpy = jest.spyOn((handler as any).logger, 'log').mockImplementation();
  });

  describe('Given a UserPasswordUpdatedEvent', () => {
    const event = new UserPasswordUpdatedEvent('user-uuid-2');

    describe('When handle is called', () => {
      it('Then it logs the password update with the user UUID', () => {
        handler.handle(event);

        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('user-uuid-2'),
        );
      });
    });
  });
});

describe('UserCreatedFromSocialEventHandler', () => {
  let handler: UserCreatedFromSocialEventHandler;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    handler = new UserCreatedFromSocialEventHandler();
    logSpy = jest.spyOn((handler as any).logger, 'log').mockImplementation();
  });

  describe('Given a UserCreatedFromSocialEvent', () => {
    const event = new UserCreatedFromSocialEvent(
      'user-uuid-3',
      'social@example.com',
      'google',
    );

    describe('When handle is called', () => {
      it('Then it logs the social creation with UUID, email, and provider', () => {
        handler.handle(event);

        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('user-uuid-3'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('google'),
        );
      });
    });
  });
});
