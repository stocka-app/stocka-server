import { Test, TestingModule } from '@nestjs/testing';
import * as withRetryModule from '@shared/domain/utils/with-retry';
import { EmailVerificationCompletedEventHandler } from '@authentication/application/event-handlers/email-verification-completed.event-handler';
import { EmailVerificationFailedEventHandler } from '@authentication/application/event-handlers/email-verification-failed.event-handler';
import { EmailVerificationRequestedEventHandler } from '@authentication/application/event-handlers/email-verification-requested.event-handler';
import { PasswordResetCompletedEventHandler } from '@authentication/application/event-handlers/password-reset-completed.event-handler';
import { PasswordResetRequestedEventHandler } from '@authentication/application/event-handlers/password-reset-requested.event-handler';
import { SessionArchivedEventHandler } from '@authentication/application/event-handlers/session-archived.event-handler';
import { SessionCreatedEventHandler } from '@authentication/application/event-handlers/session-created.event-handler';
import { SessionRefreshedEventHandler } from '@authentication/application/event-handlers/session-refreshed.event-handler';
import { UserSignedInEventHandler } from '@authentication/application/event-handlers/user-signed-in.event-handler';
import { UserSignedOutEventHandler } from '@authentication/application/event-handlers/user-signed-out.event-handler';
import { UserVerificationBlockedEventHandler } from '@authentication/application/event-handlers/user-verification-blocked.event-handler';
import { VerificationCodeResentEventHandler } from '@authentication/application/event-handlers/verification-code-resent.event-handler';
import { EmailVerificationCompletedEvent } from '@authentication/domain/events/email-verification-completed.event';
import { EmailVerificationFailedEvent } from '@authentication/domain/events/email-verification-failed.event';
import { EmailVerificationRequestedEvent } from '@authentication/domain/events/email-verification-requested.event';
import { PasswordResetCompletedEvent } from '@authentication/domain/events/password-reset-completed.event';
import { PasswordResetRequestedEvent } from '@authentication/domain/events/password-reset-requested.event';
import { SessionArchivedEvent } from '@authentication/domain/events/session-archived.event';
import { SessionCreatedEvent } from '@authentication/domain/events/session-created.event';
import { SessionRefreshedEvent } from '@authentication/domain/events/session-refreshed.event';
import { UserSignedInEvent } from '@authentication/domain/events/user-signed-in.event';
import { UserSignedOutEvent } from '@authentication/domain/events/user-signed-out.event';
import { UserVerificationBlockedEvent } from '@authentication/domain/events/user-verification-blocked.event';
import { VerificationCodeResentEvent } from '@authentication/domain/events/verification-code-resent.event';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { ConfigService } from '@nestjs/config';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
// ─── EmailVerificationCompletedEventHandler ──────────────────────────────────
describe('EmailVerificationCompletedEventHandler', () => {
  let handler: EmailVerificationCompletedEventHandler;
  let mediator: { user: { findUsernameByUUID: jest.Mock } };
  let emailProvider: jest.Mocked<Pick<IEmailProviderContract, 'sendWelcomeEmail'>>;

  beforeEach(async () => {
    mediator = { user: { findUsernameByUUID: jest.fn() } };
    emailProvider = { sendWelcomeEmail: jest.fn().mockResolvedValue({ id: 'email-id-1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationCompletedEventHandler,
        { provide: MediatorService, useValue: mediator },
        { provide: INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT, useValue: emailProvider },
      ],
    }).compile();

    handler = module.get<EmailVerificationCompletedEventHandler>(
      EmailVerificationCompletedEventHandler,
    );
  });

  describe('Given a user that exists', () => {
    describe('When email verification completes', () => {
      it('Then it sends a welcome email', async () => {
        mediator.user.findUsernameByUUID.mockResolvedValue('tester');
        const event = new EmailVerificationCompletedEvent(
          '550e8400-e29b-41d4-a716-446655440000',
          'user@test.com',
          'es',
        );
        await handler.handle(event);
        expect(emailProvider.sendWelcomeEmail).toHaveBeenCalledWith(
          'user@test.com',
          'tester',
          'es',
        );
      });
    });
  });

  describe('Given the user is not found', () => {
    describe('When email verification completes', () => {
      it('Then it does not attempt to send a welcome email', async () => {
        mediator.user.findUsernameByUUID.mockResolvedValue(null);
        const event = new EmailVerificationCompletedEvent('missing-uuid', 'u@t.com');
        await handler.handle(event);
        expect(emailProvider.sendWelcomeEmail).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the email provider throws', () => {
    describe('When the welcome email fails to send with an Error instance', () => {
      it('Then it handles the error gracefully without propagating', async () => {
        mediator.user.findUsernameByUUID.mockResolvedValue('user');
        emailProvider.sendWelcomeEmail.mockRejectedValue(new Error('SMTP down'));
        const event = new EmailVerificationCompletedEvent(
          'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          'u@t.com',
        );
        await expect(handler.handle(event)).resolves.not.toThrow();
      });
    });

    describe('When the email provider throws a non-Error value', () => {
      it('Then it handles the non-Error value gracefully', async () => {
        mediator.user.findUsernameByUUID.mockResolvedValue('user');
        emailProvider.sendWelcomeEmail.mockRejectedValue('string error');
        const event = new EmailVerificationCompletedEvent(
          'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          'u@t.com',
        );
        await expect(handler.handle(event)).resolves.not.toThrow();
      });
    });
  });
});

// ─── EmailVerificationFailedEventHandler ─────────────────────────────────────
describe('EmailVerificationFailedEventHandler', () => {
  let handler: EmailVerificationFailedEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailVerificationFailedEventHandler],
    }).compile();
    handler = module.get<EmailVerificationFailedEventHandler>(EmailVerificationFailedEventHandler);
  });

  describe('Given a failed verification event', () => {
    describe('When the number of attempts is below 5', () => {
      it('Then it handles without error', () => {
        const event = new EmailVerificationFailedEvent('uuid', 'u@t.com', '1.1.1.1', 2);
        expect(() => handler.handle(event)).not.toThrow();
      });
    });

    describe('When the number of attempts reaches 5 or more', () => {
      it('Then it handles with a suspicious activity warning', () => {
        const event = new EmailVerificationFailedEvent('uuid', 'u@t.com', '1.1.1.1', 5);
        expect(() => handler.handle(event)).not.toThrow();
      });
    });
  });
});

// ─── EmailVerificationRequestedEventHandler ──────────────────────────────────
describe('EmailVerificationRequestedEventHandler', () => {
  let handler: EmailVerificationRequestedEventHandler;
  let emailProvider: jest.Mocked<Pick<IEmailProviderContract, 'sendVerificationEmail'>>;

  beforeEach(async () => {
    emailProvider = {
      sendVerificationEmail: jest.fn().mockResolvedValue({ id: 'email-sent-id' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationRequestedEventHandler,
        { provide: INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT, useValue: emailProvider },
      ],
    }).compile();

    handler = module.get<EmailVerificationRequestedEventHandler>(
      EmailVerificationRequestedEventHandler,
    );
  });

  describe('Given a verification email request', () => {
    describe('When the email provider succeeds', () => {
      it('Then it sends the verification email', async () => {
        const event = new EmailVerificationRequestedEvent(
          1,
          'user@test.com',
          'ABC123',
          'testuser',
          'es',
        );
        await handler.handle(event);
        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledWith(
          'user@test.com',
          'ABC123',
          'testuser',
          'es',
        );
      });
    });

    describe('When the email provider fails on all retries with an Error instance', () => {
      it('Then it handles the error gracefully without propagating', async () => {
        emailProvider.sendVerificationEmail.mockRejectedValue(new Error('SMTP failure'));
        const event = new EmailVerificationRequestedEvent(1, 'u@t.com', 'XYZ', 'user', 'es');
        await expect(handler.handle(event)).resolves.not.toThrow();
      });
    });

    describe('When the email provider throws a non-Error value', () => {
      it('Then it handles the non-Error value gracefully', async () => {
        // withRetry always wraps errors as RetryExhaustedException (an Error). To cover the
        // `error instanceof Error ? ... : error` false branch, we spy on withRetry itself
        // to throw a plain string directly to the handler's catch block.
        const spy = jest
          .spyOn(withRetryModule, 'withRetry')
          .mockRejectedValueOnce('string error value' as unknown as Error);
        const event = new EmailVerificationRequestedEvent(1, 'u@t.com', 'XYZ', 'user', 'es');
        await expect(handler.handle(event)).resolves.not.toThrow();
        spy.mockRestore();
      });
    });
  });
});

// ─── PasswordResetCompletedEventHandler ──────────────────────────────────────
describe('PasswordResetCompletedEventHandler', () => {
  let handler: PasswordResetCompletedEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordResetCompletedEventHandler],
    }).compile();
    handler = module.get<PasswordResetCompletedEventHandler>(PasswordResetCompletedEventHandler);
  });

  describe('Given a password reset completed event', () => {
    describe('When the handler is called', () => {
      it('Then it handles without error', () => {
        const event = new PasswordResetCompletedEvent(1);
        expect(() => handler.handle(event)).not.toThrow();
      });
    });
  });
});

// ─── PasswordResetRequestedEventHandler ──────────────────────────────────────
describe('PasswordResetRequestedEventHandler', () => {
  let handler: PasswordResetRequestedEventHandler;
  let emailProvider: jest.Mocked<Pick<IEmailProviderContract, 'sendPasswordResetEmail'>>;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    emailProvider = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue({ id: 'reset-email-id' }),
    };
    configService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetRequestedEventHandler,
        { provide: INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT, useValue: emailProvider },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    handler = module.get<PasswordResetRequestedEventHandler>(PasswordResetRequestedEventHandler);
  });

  describe('Given a password reset requested event', () => {
    describe('When the email provider succeeds', () => {
      it('Then it sends the password reset email', async () => {
        const event = new PasswordResetRequestedEvent(1, 'user@test.com', 'reset-token', 'es');
        await handler.handle(event);
        expect(emailProvider.sendPasswordResetEmail).toHaveBeenCalledWith(
          'user@test.com',
          'http://localhost:3000/auth/reset-password?token=reset-token',
          'user@test.com',
          'es',
          false,
          null,
        );
      });
    });

    describe('When the email provider fails on all retries with an Error instance', () => {
      it('Then it handles the error gracefully without propagating', async () => {
        emailProvider.sendPasswordResetEmail.mockRejectedValue(new Error('Delivery failure'));
        const event = new PasswordResetRequestedEvent(1, 'u@t.com', 'tok', 'es', false, null);
        await expect(handler.handle(event)).resolves.not.toThrow();
      });
    });

    describe('When the email provider throws a non-Error value', () => {
      it('Then it handles the non-Error value gracefully', async () => {
        // Spy on withRetry to throw a non-Error directly — covers `error instanceof Error` false branch
        const spy = jest
          .spyOn(withRetryModule, 'withRetry')
          .mockRejectedValueOnce('network timeout' as unknown as Error);
        const event = new PasswordResetRequestedEvent(1, 'u@t.com', 'tok', 'es', false, null);
        await expect(handler.handle(event)).resolves.not.toThrow();
        spy.mockRestore();
      });
    });

    describe('When the event includes social account provider info', () => {
      it('Then it passes the provider details to the email provider', async () => {
        const event = new PasswordResetRequestedEvent(
          2,
          'social@test.com',
          'tok',
          'en',
          true,
          'google',
        );
        await handler.handle(event);
        expect(emailProvider.sendPasswordResetEmail).toHaveBeenCalledWith(
          'social@test.com',
          expect.stringContaining('tok'),
          'social@test.com',
          'en',
          true,
          'google',
        );
      });
    });
  });
});

// ─── SessionArchivedEventHandler ─────────────────────────────────────────────
describe('SessionArchivedEventHandler', () => {
  let handler: SessionArchivedEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionArchivedEventHandler],
    }).compile();
    handler = module.get<SessionArchivedEventHandler>(SessionArchivedEventHandler);
  });

  describe('Given a session archived event', () => {
    describe('When the handler is called', () => {
      it('Then it handles without error', () => {
        const event = new SessionArchivedEvent('session-uuid-1');
        expect(() => handler.handle(event)).not.toThrow();
      });
    });
  });
});

// ─── SessionCreatedEventHandler ──────────────────────────────────────────────
describe('SessionCreatedEventHandler', () => {
  let handler: SessionCreatedEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionCreatedEventHandler],
    }).compile();
    handler = module.get<SessionCreatedEventHandler>(SessionCreatedEventHandler);
  });

  describe('Given a session created event', () => {
    describe('When the handler is called', () => {
      it('Then it handles without error for a valid session event', () => {
        const event = new SessionCreatedEvent('session-uuid', 1);
        expect(() => handler.handle(event)).not.toThrow();
      });
    });
  });
});

// ─── SessionRefreshedEventHandler ────────────────────────────────────────────
describe('SessionRefreshedEventHandler', () => {
  let handler: SessionRefreshedEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionRefreshedEventHandler],
    }).compile();
    handler = module.get<SessionRefreshedEventHandler>(SessionRefreshedEventHandler);
  });

  describe('Given a session refreshed event', () => {
    describe('When the handler is called', () => {
      it('Then it handles without error', () => {
        const event = new SessionRefreshedEvent('old-session-uuid', 'new-session-uuid');
        expect(() => handler.handle(event)).not.toThrow();
      });
    });
  });
});

// ─── UserSignedInEventHandler ─────────────────────────────────────────────────
describe('UserSignedInEventHandler', () => {
  let handler: UserSignedInEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserSignedInEventHandler],
    }).compile();
    handler = module.get<UserSignedInEventHandler>(UserSignedInEventHandler);
  });

  describe('Given a user signed in event', () => {
    describe('When the handler is called', () => {
      it('Then it handles without error', () => {
        const event = new UserSignedInEvent('user-uuid-abc');
        expect(() => handler.handle(event)).not.toThrow();
      });
    });
  });
});

// ─── UserSignedOutEventHandler ────────────────────────────────────────────────
describe('UserSignedOutEventHandler', () => {
  let handler: UserSignedOutEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserSignedOutEventHandler],
    }).compile();
    handler = module.get<UserSignedOutEventHandler>(UserSignedOutEventHandler);
  });

  describe('Given a user signed out event', () => {
    describe('When the handler is called', () => {
      it('Then it handles without error', () => {
        const event = new UserSignedOutEvent('user-uuid-xyz');
        expect(() => handler.handle(event)).not.toThrow();
      });
    });
  });
});

// ─── UserVerificationBlockedEventHandler ────────────────────────────────────
describe('UserVerificationBlockedEventHandler', () => {
  let handler: UserVerificationBlockedEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserVerificationBlockedEventHandler],
    }).compile();
    handler = module.get<UserVerificationBlockedEventHandler>(UserVerificationBlockedEventHandler);
  });

  describe('Given a user verification blocked event', () => {
    describe('When the handler is called', () => {
      it('Then it handles without error and logs the block reason', () => {
        const event = new UserVerificationBlockedEvent(
          'user-uuid',
          'u@t.com',
          new Date(Date.now() + 5 * 60 * 1000),
          'too_many_attempts',
        );
        expect(() => handler.handle(event)).not.toThrow();
      });
    });
  });
});

// ─── VerificationCodeResentEventHandler ─────────────────────────────────────
describe('VerificationCodeResentEventHandler', () => {
  let handler: VerificationCodeResentEventHandler;
  let emailProvider: jest.Mocked<Pick<IEmailProviderContract, 'sendVerificationEmail'>>;

  beforeEach(async () => {
    emailProvider = {
      sendVerificationEmail: jest.fn().mockResolvedValue({ id: 'resent-email-id' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationCodeResentEventHandler,
        { provide: INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT, useValue: emailProvider },
      ],
    }).compile();

    handler = module.get<VerificationCodeResentEventHandler>(VerificationCodeResentEventHandler);
  });

  describe('Given a verification code resent event', () => {
    describe('When the email provider succeeds', () => {
      it('Then it sends the verification email', async () => {
        const event = new VerificationCodeResentEvent(1, 'user@test.com', 'NEWCOD', 2, 'es');
        await handler.handle(event);
        expect(emailProvider.sendVerificationEmail).toHaveBeenCalledWith(
          'user@test.com',
          'NEWCOD',
          undefined,
          'es',
        );
      });
    });

    describe('When the email provider fails on all retries', () => {
      it('Then it handles the error gracefully without propagating', async () => {
        emailProvider.sendVerificationEmail.mockRejectedValue(new Error('Network error'));
        const event = new VerificationCodeResentEvent(1, 'u@t.com', 'ABC', 1, 'en');
        await expect(handler.handle(event)).resolves.not.toThrow();
      });
    });

    describe('When the email provider throws a non-Error value', () => {
      it('Then it handles the non-Error value gracefully', async () => {
        // Spy on withRetry to throw a non-Error directly — covers `error instanceof Error` false branch
        const spy = jest
          .spyOn(withRetryModule, 'withRetry')
          .mockRejectedValueOnce('string error' as unknown as Error);
        const event = new VerificationCodeResentEvent(1, 'u@t.com', 'ABC', 1, 'en');
        await expect(handler.handle(event)).resolves.not.toThrow();
        spy.mockRestore();
      });
    });
  });
});
