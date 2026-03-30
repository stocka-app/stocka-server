import { SessionCreatedEventHandler } from '@authentication/application/event-handlers/session-created.event-handler';
import { SessionCreatedEvent } from '@authentication/domain/events/session-created.event';
import { UserVerificationBlockedEventHandler } from '@authentication/application/event-handlers/user-verification-blocked.event-handler';
import { UserVerificationBlockedEvent } from '@authentication/domain/events/user-verification-blocked.event';
import { PasswordResetCompletedEventHandler } from '@authentication/application/event-handlers/password-reset-completed.event-handler';
import { PasswordResetCompletedEvent } from '@authentication/domain/events/password-reset-completed.event';
import { SessionArchivedEventHandler } from '@authentication/application/event-handlers/session-archived.event-handler';
import { SessionArchivedEvent } from '@authentication/domain/events/session-archived.event';
import { SessionRefreshedEventHandler } from '@authentication/application/event-handlers/session-refreshed.event-handler';
import { SessionRefreshedEvent } from '@authentication/domain/events/session-refreshed.event';
import { UserSignedInEventHandler } from '@authentication/application/event-handlers/user-signed-in.event-handler';
import { UserSignedInEvent } from '@authentication/domain/events/user-signed-in.event';
import { UserSignedOutEventHandler } from '@authentication/application/event-handlers/user-signed-out.event-handler';
import { UserSignedOutEvent } from '@authentication/domain/events/user-signed-out.event';

describe('SessionCreatedEventHandler', () => {
  let handler: SessionCreatedEventHandler;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    handler = new SessionCreatedEventHandler();
    logSpy = jest.spyOn((handler as any).logger, 'log').mockImplementation();
  });

  describe('Given a SessionCreatedEvent', () => {
    const event = new SessionCreatedEvent('session-uuid-abc', 42);

    describe('When handle is called', () => {
      it('Then it logs the session creation with UUID and accountId', () => {
        handler.handle(event);

        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('session-uuid-abc'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('accountId=42'),
        );
      });
    });
  });
});

describe('PasswordResetCompletedEventHandler', () => {
  let handler: PasswordResetCompletedEventHandler;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    handler = new PasswordResetCompletedEventHandler();
    logSpy = jest.spyOn((handler as any).logger, 'log').mockImplementation();
  });

  describe('Given a PasswordResetCompletedEvent', () => {
    const event = new PasswordResetCompletedEvent(99);

    describe('When handle is called', () => {
      it('Then it logs the reset completion with credentialAccountId', () => {
        handler.handle(event);

        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('credentialAccountId=99'),
        );
      });
    });
  });
});

describe('SessionArchivedEventHandler', () => {
  let handler: SessionArchivedEventHandler;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    handler = new SessionArchivedEventHandler();
    logSpy = jest.spyOn((handler as any).logger, 'log').mockImplementation();
  });

  describe('Given a SessionArchivedEvent', () => {
    const event = new SessionArchivedEvent('session-uuid-xyz');

    describe('When handle is called', () => {
      it('Then it logs the archived session UUID', () => {
        handler.handle(event);

        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('session-uuid-xyz'),
        );
      });
    });
  });
});

describe('SessionRefreshedEventHandler', () => {
  let handler: SessionRefreshedEventHandler;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    handler = new SessionRefreshedEventHandler();
    logSpy = jest.spyOn((handler as any).logger, 'log').mockImplementation();
  });

  describe('Given a SessionRefreshedEvent', () => {
    const event = new SessionRefreshedEvent('old-session-uuid', 'new-session-uuid');

    describe('When handle is called', () => {
      it('Then it logs both old and new session UUIDs', () => {
        handler.handle(event);

        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('old-session-uuid'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('new-session-uuid'),
        );
      });
    });
  });
});

describe('UserSignedInEventHandler', () => {
  let handler: UserSignedInEventHandler;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    handler = new UserSignedInEventHandler();
    logSpy = jest.spyOn((handler as any).logger, 'log').mockImplementation();
  });

  describe('Given a UserSignedInEvent', () => {
    const event = new UserSignedInEvent('user-uuid-signin');

    describe('When handle is called', () => {
      it('Then it logs the signed-in user UUID', () => {
        handler.handle(event);

        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('user-uuid-signin'),
        );
      });
    });
  });
});

describe('UserSignedOutEventHandler', () => {
  let handler: UserSignedOutEventHandler;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    handler = new UserSignedOutEventHandler();
    logSpy = jest.spyOn((handler as any).logger, 'log').mockImplementation();
  });

  describe('Given a UserSignedOutEvent', () => {
    const event = new UserSignedOutEvent('user-uuid-signout');

    describe('When handle is called', () => {
      it('Then it logs the signed-out user UUID', () => {
        handler.handle(event);

        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('user-uuid-signout'),
        );
      });
    });
  });
});

describe('UserVerificationBlockedEventHandler', () => {
  let handler: UserVerificationBlockedEventHandler;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    handler = new UserVerificationBlockedEventHandler();
    warnSpy = jest.spyOn((handler as any).logger, 'warn').mockImplementation();
  });

  describe('Given a UserVerificationBlockedEvent', () => {
    const blockedUntil = new Date('2026-04-01T00:00:00Z');
    const event = new UserVerificationBlockedEvent(
      'user-uuid-1',
      'test@example.com',
      blockedUntil,
      'too_many_attempts',
    );

    describe('When handle is called', () => {
      it('Then it logs the block with UUID, date, and reason', () => {
        handler.handle(event);

        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('user-uuid-1'),
        );
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('too_many_attempts'),
        );
      });
    });
  });
});
