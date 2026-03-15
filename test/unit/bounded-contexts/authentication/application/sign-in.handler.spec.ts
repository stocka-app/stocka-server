import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventPublisher, EventBus } from '@nestjs/cqrs';
import { SignInHandler } from '@authentication/application/commands/sign-in/sign-in.handler';
import { SignInCommand } from '@authentication/application/commands/sign-in/sign-in.command';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { InvalidCredentialsException } from '@authentication/domain/exceptions/invalid-credentials.exception';
import { AccountDeactivatedException } from '@authentication/domain/exceptions/account-deactivated.exception';
import { EmailNotVerifiedException } from '@authentication/domain/exceptions/email-not-verified.exception';
import { SocialAccountRequiredException } from '@authentication/domain/exceptions/social-account-required.exception';
import { AccountType } from '@user/domain/models/user.aggregate';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';
import * as bcrypt from 'bcrypt';

describe('SignInHandler', () => {
  let handler: SignInHandler;
  let mediatorService: { user: { findByEmailOrUsername: jest.Mock } };
  let jwtService: jest.Mocked<JwtService>;
  let sessionContract: jest.Mocked<ISessionContract>;

  const validPasswordHash = bcrypt.hashSync('Password1', 12);

  beforeEach(async () => {
    const mockMediatorService = {
      user: {
        findByEmailOrUsername: jest.fn(),
      },
    };

    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          JWT_ACCESS_SECRET: 'test-access-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_ACCESS_EXPIRATION: '15m',
          JWT_REFRESH_EXPIRATION: '7d',
        };
        return config[key];
      }),
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          JWT_ACCESS_SECRET: 'test-access-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_ACCESS_EXPIRATION: '15m',
          JWT_REFRESH_EXPIRATION: '7d',
        };
        const value = config[key];
        if (value === undefined) {
          throw new Error(`Configuration key "${key}" does not exist`);
        }
        return value;
      }),
    };

    const mockSessionContract = {
      persist: jest.fn(),
    };

    const mockEventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj) => obj),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignInHandler,
        { provide: MediatorService, useValue: mockMediatorService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventPublisher, useValue: mockEventPublisher },
        { provide: EventBus, useValue: mockEventBus },
        { provide: INJECTION_TOKENS.SESSION_CONTRACT, useValue: mockSessionContract },
      ],
    }).compile();

    handler = module.get<SignInHandler>(SignInHandler);
    mediatorService = module.get(MediatorService);
    jwtService = module.get(JwtService);
    sessionContract = module.get(INJECTION_TOKENS.SESSION_CONTRACT);

    // Default JWT signs
    jwtService.signAsync.mockResolvedValue('mock-token');
  });

  it('should successfully sign in with valid credentials (email)', async () => {
    const command = new SignInCommand('test@example.com', 'Password1');
    const mockUser = UserMother.create({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: validPasswordHash,
    });

    mediatorService.user.findByEmailOrUsername.mockResolvedValue(mockUser);
    sessionContract.persist.mockResolvedValue(expect.anything());

    const result = await handler.execute(command);

    expect(result.isOk()).toBe(true);
    const data = result._unsafeUnwrap();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('test@example.com');
    expect(data.accessToken).toBe('mock-token');
    expect(data.refreshToken).toBe('mock-token');
    expect(sessionContract.persist).toHaveBeenCalled();
  });

  it('should successfully sign in with valid credentials (username)', async () => {
    const command = new SignInCommand('testuser', 'Password1');
    const mockUser = UserMother.create({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: validPasswordHash,
    });

    mediatorService.user.findByEmailOrUsername.mockResolvedValue(mockUser);
    sessionContract.persist.mockResolvedValue(expect.anything());

    const result = await handler.execute(command);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().user.username).toBe('testuser');
  });

  it('should return InvalidCredentialsException error when user does not exist', async () => {
    const command = new SignInCommand('nonexistent@example.com', 'Password1');

    mediatorService.user.findByEmailOrUsername.mockResolvedValue(null);

    const result = await handler.execute(command);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidCredentialsException);
    expect(sessionContract.persist).not.toHaveBeenCalled();
  });

  it('should return InvalidCredentialsException error when password is incorrect', async () => {
    const command = new SignInCommand('test@example.com', 'WrongPassword1');
    const mockUser = UserMother.create({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: validPasswordHash,
    });

    mediatorService.user.findByEmailOrUsername.mockResolvedValue(mockUser);

    const result = await handler.execute(command);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidCredentialsException);
    expect(sessionContract.persist).not.toHaveBeenCalled();
  });

  it('should return InvalidCredentialsException error when user has no password (social-only)', async () => {
    const command = new SignInCommand('social@example.com', 'Password1');
    const mockUser = UserMother.createSocialOnly({
      id: 1,
      email: 'social@example.com',
      username: 'socialuser',
    });

    mediatorService.user.findByEmailOrUsername.mockResolvedValue(mockUser);

    const result = await handler.execute(command);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidCredentialsException);
    expect(sessionContract.persist).not.toHaveBeenCalled();
  });

  it('should return AccountDeactivatedException error when user is archived', async () => {
    const command = new SignInCommand('archived@example.com', 'Password1');
    const mockUser = UserMother.createArchived({
      id: 1,
      email: 'archived@example.com',
      username: 'archiveduser',
      passwordHash: validPasswordHash,
    });

    mediatorService.user.findByEmailOrUsername.mockResolvedValue(mockUser);

    const result = await handler.execute(command);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(AccountDeactivatedException);
    expect(sessionContract.persist).not.toHaveBeenCalled();
  });

  it('should return EmailNotVerifiedException error when user is a pending manual account', async () => {
    const command = new SignInCommand('pending@example.com', 'Password1');
    const pendingUser = UserMother.create({
      id: 11,
      email: 'pending@example.com',
      username: 'pending_user',
      passwordHash: validPasswordHash,
      status: 'pending_verification',
      accountType: AccountType.MANUAL,
    });

    mediatorService.user.findByEmailOrUsername.mockResolvedValue(pendingUser);

    const result = await handler.execute(command);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(EmailNotVerifiedException);
    expect(sessionContract.persist).not.toHaveBeenCalled();
  });

  it('should return SocialAccountRequiredException error when user is Flexible Pendiente (linked OAuth but email unverified)', async () => {
    // A manual user who linked Google before verifying their email — EC-002 "Flexible Pendiente" state
    const command = new SignInCommand('flex@example.com', 'Password1');
    const flexiblePendingUser = UserMother.create({
      id: 10,
      email: 'flex@example.com',
      username: 'flex_user',
      passwordHash: validPasswordHash,
      status: 'pending_verification',
      accountType: AccountType.FLEXIBLE,
    });

    mediatorService.user.findByEmailOrUsername.mockResolvedValue(flexiblePendingUser);

    const result = await handler.execute(command);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(SocialAccountRequiredException);
    expect(sessionContract.persist).not.toHaveBeenCalled();
  });

  it('should use default expiration values when configService.get returns undefined', async () => {
    // Covers lines 87-89: JWT_ACCESS_EXPIRATION || '15m' and JWT_REFRESH_EXPIRATION || '7d'
    const command = new SignInCommand('test@example.com', 'Password1');
    const mockUser = UserMother.create({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: validPasswordHash,
    });

    // configService that returns undefined for expiration keys → triggers || fallbacks
    const mockConfigUndefined = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_EXPIRATION' || key === 'JWT_REFRESH_EXPIRATION') return undefined;
        const config: Record<string, string> = {
          JWT_ACCESS_SECRET: 'test-access-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
        };
        return config[key];
      }),
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          JWT_ACCESS_SECRET: 'test-access-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
        };
        const value = config[key];
        if (value === undefined) throw new Error(`Key "${key}" not found`);
        return value;
      }),
    };

    const newModule = await Test.createTestingModule({
      providers: [
        SignInHandler,
        { provide: MediatorService, useValue: mediatorService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: mockConfigUndefined },
        { provide: EventPublisher, useValue: { mergeObjectContext: jest.fn().mockImplementation((o) => o) } },
        { provide: EventBus, useValue: { publish: jest.fn() } },
        { provide: INJECTION_TOKENS.SESSION_CONTRACT, useValue: sessionContract },
      ],
    }).compile();

    const handlerWithDefaults = newModule.get<SignInHandler>(SignInHandler);
    jwtService.signAsync.mockResolvedValue('mock-token');
    mediatorService.user.findByEmailOrUsername.mockResolvedValue(mockUser);
    sessionContract.persist.mockResolvedValue(expect.anything());

    const result = await handlerWithDefaults.execute(command);

    expect(result.isOk()).toBe(true);
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ expiresIn: '15m' }),
    );
  });
});
