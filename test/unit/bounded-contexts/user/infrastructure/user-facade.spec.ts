import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { UserFacade } from '@user/infrastructure/facade/user.facade';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { ISocialAccountContract } from '@user/domain/contracts/social-account.contract';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { IPersistedUserView } from '@shared/domain/contracts/user-view.contract';
import { ok, err } from '@shared/domain/result';

// ── Type-unsafe mock helper ────────────────────────────────────────────────────
// IUserContract methods return UserAggregate but UserFacade exposes IUserView interface.
// We use unknown cast to avoid coupling test data to the concrete aggregate class.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReturn(mockFn: jest.Mock, value: unknown): void {
  mockFn.mockResolvedValue(value as unknown);
}

// ── Mock helpers ───────────────────────────────────────────────────────────────

function buildPersistedUser(overrides?: object): IPersistedUserView {
  return {
    id: 1,
    uuid: 'user-uuid-1',
    email: 'user@example.com',
    username: 'testuser',
    passwordHash: 'hash',
    emailVerifiedAt: null,
    verificationBlockedUntil: null,
    createdWith: 'email',
    accountType: 'manual',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    archivedAt: null,
    hasPassword: jest.fn().mockReturnValue(true),
    isFlexiblePending: jest.fn().mockReturnValue(false),
    isEmailVerified: jest.fn().mockReturnValue(true),
    isArchived: jest.fn().mockReturnValue(false),
    isPendingVerification: jest.fn().mockReturnValue(false),
    requiresEmailVerification: jest.fn().mockReturnValue(false),
    ...overrides,
  } as unknown as IPersistedUserView;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('UserFacade', () => {
  let facade: UserFacade;
  let commandBus: jest.Mocked<CommandBus>;
  let userContract: jest.Mocked<IUserContract>;
  let socialAccountContract: jest.Mocked<ISocialAccountContract>;
  let uow: jest.Mocked<IUnitOfWork>;

  beforeEach(async () => {
    commandBus = { execute: jest.fn() } as unknown as jest.Mocked<CommandBus>;
    userContract = {
      persist: jest.fn(),
      findById: jest.fn(),
      findByUUID: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailOrUsername: jest.fn(),
      existsByUsername: jest.fn(),
      existsByEmail: jest.fn(),
      findByUsername: jest.fn(),
      archive: jest.fn(),
      destroy: jest.fn(),
      destroyStaleUnverifiedUsers: jest.fn(),
    } as unknown as jest.Mocked<IUserContract>;
    socialAccountContract = {
      findByProviderAndProviderId: jest.fn(),
    } as unknown as jest.Mocked<ISocialAccountContract>;
    uow = {
      isActive: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<IUnitOfWork>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserFacade,
        { provide: CommandBus, useValue: commandBus },
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
        { provide: INJECTION_TOKENS.SOCIAL_ACCOUNT_CONTRACT, useValue: socialAccountContract },
        { provide: INJECTION_TOKENS.UNIT_OF_WORK, useValue: uow },
      ],
    }).compile();

    facade = module.get(UserFacade);
  });

  // ── createUser ──────────────────────────────────────────────────────────────

  describe('Given no active Unit of Work', () => {
    describe('When createUser is called', () => {
      it('Then it dispatches CreateUserCommand through the CommandBus', async () => {
        const persistedUser = buildPersistedUser();
        commandBus.execute.mockResolvedValue(ok(persistedUser));

        const result = await facade.createUser('user@example.com', 'testuser', 'hash');

        expect(commandBus.execute).toHaveBeenCalled();
        expect(result.email).toBe('user@example.com');
      });

      it('Then it throws if the command returns a failure Result', async () => {
        const { UserNotFoundExc } = await buildUserNotFoundDouble();
        commandBus.execute.mockResolvedValue(err(new Error('Something failed')));

        await expect(
          facade.createUser('fail@example.com', 'failuser', 'hash'),
        ).rejects.toThrow();
      });
    });
  });

  describe('Given an active Unit of Work', () => {
    describe('When createUser is called', () => {
      it('Then it uses the userContract directly (bypasses CommandBus)', async () => {
        uow.isActive.mockReturnValue(true);
        const persistedUser = buildPersistedUser();
        mockReturn(userContract.persist as jest.Mock, persistedUser);

        const result = await facade.createUser('user@example.com', 'testuser', 'hash');

        expect(commandBus.execute).not.toHaveBeenCalled();
        expect(userContract.persist).toHaveBeenCalled();
        expect(result.email).toBe('user@example.com');
      });

      it('Then it throws if the persisted user has no id (invariant violation)', async () => {
        uow.isActive.mockReturnValue(true);
        mockReturn(userContract.persist as jest.Mock, { id: undefined });

        await expect(
          facade.createUser('user@example.com', 'user', 'hash'),
        ).rejects.toThrow('Invariant violation: persisted user must have an id');
      });
    });
  });

  // ── createUserFromSocial ────────────────────────────────────────────────────

  describe('When createUserFromSocial is called', () => {
    it('Then it dispatches CreateUserFromSocialCommand and returns the persisted user', async () => {
      const persistedUser = buildPersistedUser({ email: 'social@example.com' });
      commandBus.execute.mockResolvedValue(ok(persistedUser));

      const result = await facade.createUserFromSocial(
        'social@example.com',
        'socialuser',
        'google',
        'google-id-123',
      );

      expect(commandBus.execute).toHaveBeenCalled();
      expect(result.email).toBe('social@example.com');
    });

    it('Then it throws if the command returns a failure Result', async () => {
      commandBus.execute.mockResolvedValue(err(new Error('Social sign-in failed')));

      await expect(
        facade.createUserFromSocial('fail@example.com', 'failuser', 'google', 'gid'),
      ).rejects.toThrow();
    });
  });

  // ── linkProviderToUser ───────────────────────────────────────────────────────

  describe('When linkProviderToUser is called', () => {
    it('Then it dispatches LinkProviderToUserCommand without returning a value', async () => {
      commandBus.execute.mockResolvedValue(ok(undefined));

      await expect(
        facade.linkProviderToUser(1, 'google', 'gid-123'),
      ).resolves.toBeUndefined();
      expect(commandBus.execute).toHaveBeenCalled();
    });

    it('Then it throws if the command returns a failure Result', async () => {
      commandBus.execute.mockResolvedValue(err(new Error('Link failed')));

      await expect(
        facade.linkProviderToUser(1, 'google', 'gid-123'),
      ).rejects.toThrow();
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('When findById is called', () => {
    it('Then it returns the persisted user view when found', async () => {
      const user = buildPersistedUser({ id: 5 });
      mockReturn(userContract.findById as jest.Mock, user);

      const result = await facade.findById(5);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(5);
    });

    it('Then it returns null when the user is not found', async () => {
      userContract.findById.mockResolvedValue(null);
      const result = await facade.findById(999);
      expect(result).toBeNull();
    });
  });

  // ── findByUUID ──────────────────────────────────────────────────────────────

  describe('When findByUUID is called', () => {
    it('Then it returns the persisted user view when found', async () => {
      const user = buildPersistedUser({ uuid: 'some-uuid' });
      mockReturn(userContract.findByUUID as jest.Mock, user);

      const result = await facade.findByUUID('some-uuid');
      expect(result?.uuid).toBe('some-uuid');
    });

    it('Then it returns null when not found', async () => {
      mockReturn(userContract.findByUUID as jest.Mock, null);
      const result = await facade.findByUUID('not-found');
      expect(result).toBeNull();
    });
  });

  // ── findByEmail ─────────────────────────────────────────────────────────────

  describe('When findByEmail is called', () => {
    it('Then it returns the user when found', async () => {
      const user = buildPersistedUser();
      mockReturn(userContract.findByEmail as jest.Mock, user);
      const result = await facade.findByEmail('user@example.com');
      expect(result).not.toBeNull();
    });

    it('Then it returns null when not found', async () => {
      mockReturn(userContract.findByEmail as jest.Mock, null);
      const result = await facade.findByEmail('missing@example.com');
      expect(result).toBeNull();
    });
  });

  // ── findByEmailOrUsername ────────────────────────────────────────────────────

  describe('When findByEmailOrUsername is called', () => {
    it('Then it delegates to userContract and returns the match', async () => {
      const user = buildPersistedUser();
      mockReturn(userContract.findByEmailOrUsername as jest.Mock, user);
      const result = await facade.findByEmailOrUsername('testuser');
      expect(result).not.toBeNull();
    });

    it('Then it returns null when no user matches the identifier', async () => {
      mockReturn(userContract.findByEmailOrUsername as jest.Mock, null);
      const result = await facade.findByEmailOrUsername('unknown');
      expect(result).toBeNull();
    });
  });

  // ── existsByUsername ────────────────────────────────────────────────────────

  describe('When existsByUsername is called', () => {
    it('Then it returns true when the username exists', async () => {
      userContract.existsByUsername.mockResolvedValue(true);
      const result = await facade.existsByUsername('takenuser');
      expect(result).toBe(true);
    });

    it('Then it returns false when the username is available', async () => {
      userContract.existsByUsername.mockResolvedValue(false);
      const result = await facade.existsByUsername('freeuser');
      expect(result).toBe(false);
    });
  });

  // ── findUserBySocialProvider ─────────────────────────────────────────────────

  describe('When findUserBySocialProvider is called', () => {
    it('Then it returns the user when the social account is found', async () => {
      const socialAccount = { userId: 1 };
      const user = buildPersistedUser({ id: 1 });
      mockReturn(socialAccountContract.findByProviderAndProviderId as jest.Mock, socialAccount);
      mockReturn(userContract.findById as jest.Mock, user);

      const result = await facade.findUserBySocialProvider('google', 'gid-123');
      expect(result).not.toBeNull();
    });

    it('Then it returns null when no social account matches', async () => {
      mockReturn(socialAccountContract.findByProviderAndProviderId as jest.Mock, null);
      const result = await facade.findUserBySocialProvider('github', 'not-found');
      expect(result).toBeNull();
    });

    it('Then it returns null when the social account exists but the user is not found', async () => {
      mockReturn(socialAccountContract.findByProviderAndProviderId as jest.Mock, { userId: 99 });
      mockReturn(userContract.findById as jest.Mock, null);
      const result = await facade.findUserBySocialProvider('google', 'gid-orphan');
      expect(result).toBeNull();
    });
  });
});

// ── Helper for domain exception import ───────────────────────────────────────
async function buildUserNotFoundDouble(): Promise<{ UserNotFoundExc: new () => Error }> {
  return { UserNotFoundExc: class extends Error {} };
}
