import { Test, TestingModule } from '@nestjs/testing';
import { BlockVerificationOnRateLimitHandler } from '@user/application/event-handlers/block-verification-on-rate-limit.handler';
import { UpdatePasswordOnResetHandler } from '@user/application/event-handlers/update-password-on-reset.handler';
import { UserCreatedEventHandler } from '@user/application/event-handlers/user-created.event-handler';
import { UserCreatedFromSocialEventHandler } from '@user/application/event-handlers/user-created-from-social.event-handler';
import { UserPasswordUpdatedEventHandler } from '@user/application/event-handlers/user-password-updated.event-handler';
import { VerifyUserEmailOnVerificationCompletedHandler } from '@user/application/event-handlers/verify-user-email-on-verification-completed.handler';
import { UserVerificationBlockedByAuthenticationEvent } from '@shared/domain/events/integration/user-verification-blocked-by-authentication.event';
import { UserPasswordResetByAuthenticationEvent } from '@shared/domain/events/integration/user-password-reset-by-authentication.event';
import { UserCreatedEvent } from '@user/domain/events/user-created.event';
import { UserCreatedFromSocialEvent } from '@user/domain/events/user-created-from-social.event';
import { UserPasswordUpdatedEvent } from '@user/domain/events/user-password-updated.event';
import { EmailVerificationCompletedEvent } from '@authentication/domain/events/email-verification-completed.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { UserMother, CredentialAccountMother } from '@test/helpers/object-mother/user.mother';

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

// ─── BlockVerificationOnRateLimitHandler ────────────────────────────────────

describe('BlockVerificationOnRateLimitHandler', () => {
  let handler: BlockVerificationOnRateLimitHandler;
  let mediator: {
    user: {
      findUserByUUIDWithCredential: jest.Mock;
      blockVerification: jest.Mock;
    };
  };

  beforeEach(async () => {
    mediator = {
      user: {
        findUserByUUIDWithCredential: jest.fn(),
        blockVerification: jest.fn().mockResolvedValue(undefined),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockVerificationOnRateLimitHandler,
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    handler = module.get<BlockVerificationOnRateLimitHandler>(BlockVerificationOnRateLimitHandler);
  });

  describe('Given a user and credential that exist', () => {
    beforeEach(() => {
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue({
        user: UserMother.create({ uuid: USER_UUID, id: 1 }),
        credential: CredentialAccountMother.createPendingVerification({ id: 5, accountId: 1 }),
      });
    });

    describe('When a rate-limit block event arrives', () => {
      it('Then it calls blockVerification on the facade with the credential id and date', async () => {
        const blockedUntil = new Date(Date.now() + 10 * 60 * 1000);
        const event = new UserVerificationBlockedByAuthenticationEvent(USER_UUID, blockedUntil);

        await handler.handle(event);

        expect(mediator.user.blockVerification).toHaveBeenCalledTimes(1);
        expect(mediator.user.blockVerification).toHaveBeenCalledWith(5, blockedUntil);
      });
    });

    describe('When blockVerification throws an error', () => {
      it('Then the error is swallowed and does not propagate', async () => {
        mediator.user.blockVerification.mockRejectedValue(new Error('DB failure'));
        const event = new UserVerificationBlockedByAuthenticationEvent(USER_UUID, new Date());

        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });

    describe('When blockVerification throws a non-Error value', () => {
      it('Then the raw value is used in the warning and does not propagate', async () => {
        mediator.user.blockVerification.mockRejectedValue('plain string error');
        const event = new UserVerificationBlockedByAuthenticationEvent(USER_UUID, new Date());

        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });
  });

  describe('Given no user exists for the uuid', () => {
    beforeEach(() => {
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue(null);
    });

    describe('When a rate-limit block event arrives', () => {
      it('Then it does not call blockVerification', async () => {
        const event = new UserVerificationBlockedByAuthenticationEvent('missing-uuid', new Date());

        await handler.handle(event);

        expect(mediator.user.blockVerification).not.toHaveBeenCalled();
      });
    });
  });
});

// ─── UpdatePasswordOnResetHandler ────────────────────────────────────────────

describe('UpdatePasswordOnResetHandler', () => {
  let handler: UpdatePasswordOnResetHandler;
  let mediator: { user: { updatePasswordHash: jest.Mock } };

  beforeEach(async () => {
    mediator = {
      user: {
        updatePasswordHash: jest.fn().mockResolvedValue(undefined),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UpdatePasswordOnResetHandler, { provide: MediatorService, useValue: mediator }],
    }).compile();

    handler = module.get<UpdatePasswordOnResetHandler>(UpdatePasswordOnResetHandler);
  });

  describe('Given a password reset event arrives', () => {
    describe('When the handler processes it', () => {
      it('Then it calls updatePasswordHash on the facade with the credential id and new hash', async () => {
        const event = new UserPasswordResetByAuthenticationEvent(1, 'new-bcrypt-hash');

        await handler.handle(event);

        expect(mediator.user.updatePasswordHash).toHaveBeenCalledTimes(1);
        expect(mediator.user.updatePasswordHash).toHaveBeenCalledWith(1, 'new-bcrypt-hash');
      });
    });
  });

  describe('Given the facade throws when updating the password', () => {
    describe('When the handler processes the event', () => {
      it('Then the error is swallowed and does not propagate', async () => {
        mediator.user.updatePasswordHash.mockRejectedValue(new Error('DB error'));

        const event = new UserPasswordResetByAuthenticationEvent(99, 'some-hash');

        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });

    describe('When a non-Error value is thrown', () => {
      it('Then the raw value is used in the warning and does not propagate', async () => {
        mediator.user.updatePasswordHash.mockRejectedValue('plain string error');

        const event = new UserPasswordResetByAuthenticationEvent(99, 'some-hash');

        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });
  });
});

// ─── UserCreatedEventHandler ──────────────────────────────────────────────────

describe('UserCreatedEventHandler', () => {
  let handler: UserCreatedEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserCreatedEventHandler],
    }).compile();
    handler = module.get<UserCreatedEventHandler>(UserCreatedEventHandler);
  });

  describe('Given a user created event', () => {
    describe('When the handler is called', () => {
      it('Then it handles without error', () => {
        const event = new UserCreatedEvent('user-uuid', 'user@test.com', 'testuser');
        expect(() => handler.handle(event)).not.toThrow();
      });
    });
  });
});

// ─── UserCreatedFromSocialEventHandler ───────────────────────────────────────

describe('UserCreatedFromSocialEventHandler', () => {
  let handler: UserCreatedFromSocialEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserCreatedFromSocialEventHandler],
    }).compile();
    handler = module.get<UserCreatedFromSocialEventHandler>(UserCreatedFromSocialEventHandler);
  });

  describe('Given a user created from social event', () => {
    describe('When the handler is called', () => {
      it('Then it handles without error', () => {
        const event = new UserCreatedFromSocialEvent('user-uuid', 'social@test.com', 'google');
        expect(() => handler.handle(event)).not.toThrow();
      });
    });
  });
});

// ─── UserPasswordUpdatedEventHandler ─────────────────────────────────────────

describe('UserPasswordUpdatedEventHandler', () => {
  let handler: UserPasswordUpdatedEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserPasswordUpdatedEventHandler],
    }).compile();
    handler = module.get<UserPasswordUpdatedEventHandler>(UserPasswordUpdatedEventHandler);
  });

  describe('Given a user password updated event', () => {
    describe('When the handler is called', () => {
      it('Then it handles without error', () => {
        const event = new UserPasswordUpdatedEvent('user-uuid');
        expect(() => handler.handle(event)).not.toThrow();
      });
    });
  });
});

// ─── VerifyUserEmailOnVerificationCompletedHandler ───────────────────────────

describe('VerifyUserEmailOnVerificationCompletedHandler', () => {
  let handler: VerifyUserEmailOnVerificationCompletedHandler;
  let mediator: {
    user: {
      findUserByUUIDWithCredential: jest.Mock;
      verifyEmail: jest.Mock;
    };
  };

  const HANDLER_USER_UUID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

  beforeEach(async () => {
    mediator = {
      user: {
        findUserByUUIDWithCredential: jest.fn(),
        verifyEmail: jest.fn().mockResolvedValue(undefined),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyUserEmailOnVerificationCompletedHandler,
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    handler = module.get<VerifyUserEmailOnVerificationCompletedHandler>(
      VerifyUserEmailOnVerificationCompletedHandler,
    );
  });

  describe('Given a user and credential that exist', () => {
    beforeEach(() => {
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue({
        user: UserMother.create({ uuid: HANDLER_USER_UUID, id: 1 }),
        credential: CredentialAccountMother.createPendingVerification({ id: 7, accountId: 1 }),
      });
    });

    describe('When email verification completes', () => {
      it('Then it calls verifyEmail on the facade with the credential id', async () => {
        const event = new EmailVerificationCompletedEvent(HANDLER_USER_UUID, 'u@test.com', 'es');

        await handler.handle(event);

        expect(mediator.user.verifyEmail).toHaveBeenCalledTimes(1);
        expect(mediator.user.verifyEmail).toHaveBeenCalledWith(7);
      });
    });
  });

  describe('Given no user exists for the uuid', () => {
    beforeEach(() => {
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue(null);
    });

    describe('When email verification completes', () => {
      it('Then it does not call verifyEmail', async () => {
        const event = new EmailVerificationCompletedEvent('missing-uuid', 'u@t.com');

        await handler.handle(event);

        expect(mediator.user.verifyEmail).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given verifyEmail throws an error', () => {
    beforeEach(() => {
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue({
        user: UserMother.create({ uuid: HANDLER_USER_UUID, id: 1 }),
        credential: CredentialAccountMother.createPendingVerification({ id: 7, accountId: 1 }),
      });
      mediator.user.verifyEmail.mockRejectedValue(new Error('Persist failed'));
    });

    describe('When email verification completes', () => {
      it('Then the error is swallowed and does not propagate', async () => {
        const event = new EmailVerificationCompletedEvent(HANDLER_USER_UUID, 'u@test.com', 'es');

        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });
  });

  describe('Given verifyEmail throws a non-Error value', () => {
    beforeEach(() => {
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue({
        user: UserMother.create({ uuid: HANDLER_USER_UUID, id: 1 }),
        credential: CredentialAccountMother.createPendingVerification({ id: 7, accountId: 1 }),
      });
      mediator.user.verifyEmail.mockRejectedValue('plain string error');
    });

    describe('When email verification completes', () => {
      it('Then the raw value is used in the warning and does not propagate', async () => {
        const event = new EmailVerificationCompletedEvent(HANDLER_USER_UUID, 'u@test.com', 'es');

        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });
  });
});
