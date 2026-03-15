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
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

// ─── BlockVerificationOnRateLimitHandler ────────────────────────────────────
describe('BlockVerificationOnRateLimitHandler', () => {
  let handler: BlockVerificationOnRateLimitHandler;
  let userContract: jest.Mocked<Pick<IUserContract, 'findByUUID' | 'persist'>>;

  const USER_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  beforeEach(async () => {
    userContract = {
      findByUUID: jest.fn(),
      persist: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockVerificationOnRateLimitHandler,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
      ],
    }).compile();

    handler = module.get<BlockVerificationOnRateLimitHandler>(BlockVerificationOnRateLimitHandler);
  });

  describe('Given a user that exists', () => {
    beforeEach(() => {
      userContract.findByUUID.mockResolvedValue(
        UserMother.create({ uuid: USER_UUID, id: 1 }),
      );
    });

    describe('When a rate-limit block event arrives', () => {
      it('Then it blocks the user and persists the updated aggregate', async () => {
        const blockedUntil = new Date(Date.now() + 10 * 60 * 1000);
        const event = new UserVerificationBlockedByAuthenticationEvent(USER_UUID, blockedUntil);
        await handler.handle(event);
        expect(userContract.persist).toHaveBeenCalledTimes(1);
        const persistedUser = userContract.persist.mock.calls[0][0] as ReturnType<typeof UserMother.create>;
        expect(persistedUser.verificationBlockedUntil).toEqual(blockedUntil);
      });
    });
  });

  describe('Given a user that does not exist', () => {
    beforeEach(() => {
      userContract.findByUUID.mockResolvedValue(null);
    });

    describe('When a rate-limit block event arrives', () => {
      it('Then it does not persist anything', async () => {
        const event = new UserVerificationBlockedByAuthenticationEvent(
          'missing-uuid',
          new Date(),
        );
        await handler.handle(event);
        expect(userContract.persist).not.toHaveBeenCalled();
      });
    });
  });
});

// ─── UpdatePasswordOnResetHandler ────────────────────────────────────────────
describe('UpdatePasswordOnResetHandler', () => {
  let handler: UpdatePasswordOnResetHandler;
  let userContract: jest.Mocked<Pick<IUserContract, 'findById' | 'persist'>>;

  beforeEach(async () => {
    userContract = {
      findById: jest.fn(),
      persist: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdatePasswordOnResetHandler,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
      ],
    }).compile();

    handler = module.get<UpdatePasswordOnResetHandler>(UpdatePasswordOnResetHandler);
  });

  describe('Given a user that exists', () => {
    beforeEach(() => {
      userContract.findById.mockResolvedValue(UserMother.create({ id: 1 }));
    });

    describe('When a password reset integration event arrives', () => {
      it('Then it updates the password hash and persists the user', async () => {
        const event = new UserPasswordResetByAuthenticationEvent(1, 'new-bcrypt-hash');
        await handler.handle(event);
        expect(userContract.persist).toHaveBeenCalledTimes(1);
        const persistedUser = userContract.persist.mock.calls[0][0] as ReturnType<typeof UserMother.create>;
        expect(persistedUser.passwordHash).toBe('new-bcrypt-hash');
      });
    });
  });

  describe('Given a user that does not exist', () => {
    beforeEach(() => {
      userContract.findById.mockResolvedValue(null);
    });

    describe('When a password reset integration event arrives', () => {
      it('Then it does not persist anything', async () => {
        const event = new UserPasswordResetByAuthenticationEvent(99, 'some-hash');
        await handler.handle(event);
        expect(userContract.persist).not.toHaveBeenCalled();
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
  let userContract: jest.Mocked<Pick<IUserContract, 'findByUUID' | 'persist'>>;

  const USER_UUID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

  beforeEach(async () => {
    userContract = {
      findByUUID: jest.fn(),
      persist: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyUserEmailOnVerificationCompletedHandler,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
      ],
    }).compile();

    handler = module.get<VerifyUserEmailOnVerificationCompletedHandler>(
      VerifyUserEmailOnVerificationCompletedHandler,
    );
  });

  describe('Given a user that exists', () => {
    beforeEach(() => {
      userContract.findByUUID.mockResolvedValue(
        UserMother.createPendingVerification({ uuid: USER_UUID, id: 1 }),
      );
    });

    describe('When email verification completes', () => {
      it('Then it marks the user email as verified and persists', async () => {
        const event = new EmailVerificationCompletedEvent(USER_UUID, 'u@test.com', 'es');
        await handler.handle(event);
        expect(userContract.persist).toHaveBeenCalledTimes(1);
        const persistedUser = userContract.persist.mock.calls[0][0] as ReturnType<typeof UserMother.create>;
        expect(persistedUser.isEmailVerified()).toBe(true);
      });
    });
  });

  describe('Given a user that does not exist', () => {
    beforeEach(() => {
      userContract.findByUUID.mockResolvedValue(null);
    });

    describe('When email verification completes', () => {
      it('Then it does not persist anything', async () => {
        const event = new EmailVerificationCompletedEvent('missing-uuid', 'u@t.com');
        await handler.handle(event);
        expect(userContract.persist).not.toHaveBeenCalled();
      });
    });
  });
});
