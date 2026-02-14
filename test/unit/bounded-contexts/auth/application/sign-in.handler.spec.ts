import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventPublisher, EventBus } from '@nestjs/cqrs';
import { SignInHandler } from '@auth/application/commands/sign-in/sign-in.handler';
import { SignInCommand } from '@auth/application/commands/sign-in/sign-in.command';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { ISessionContract } from '@auth/domain/contracts/session.contract';
import { InvalidCredentialsException } from '@auth/domain/exceptions/invalid-credentials.exception';
import { AccountDeactivatedException } from '@auth/domain/exceptions/account-deactivated.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';
import * as bcrypt from 'bcrypt';

describe('SignInHandler', () => {
  let handler: SignInHandler;
  let mediatorService: jest.Mocked<MediatorService>;
  let jwtService: jest.Mocked<JwtService>;
  let sessionContract: jest.Mocked<ISessionContract>;

  const validPasswordHash = bcrypt.hashSync('Password1', 12);

  beforeEach(async () => {
    const mockMediatorService = {
      findUserByEmailOrUsername: jest.fn(),
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

    mediatorService.findUserByEmailOrUsername.mockResolvedValue(mockUser);
    sessionContract.persist.mockResolvedValue(expect.anything());

    const result = await handler.execute(command);

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(result.accessToken).toBe('mock-token');
    expect(result.refreshToken).toBe('mock-token');
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

    mediatorService.findUserByEmailOrUsername.mockResolvedValue(mockUser);
    sessionContract.persist.mockResolvedValue(expect.anything());

    const result = await handler.execute(command);

    expect(result.user).toBeDefined();
    expect(result.user.username).toBe('testuser');
  });

  it('should throw InvalidCredentialsException when user does not exist', async () => {
    const command = new SignInCommand('nonexistent@example.com', 'Password1');

    mediatorService.findUserByEmailOrUsername.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(InvalidCredentialsException);
    expect(sessionContract.persist).not.toHaveBeenCalled();
  });

  it('should throw InvalidCredentialsException when password is incorrect', async () => {
    const command = new SignInCommand('test@example.com', 'WrongPassword1');
    const mockUser = UserMother.create({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: validPasswordHash,
    });

    mediatorService.findUserByEmailOrUsername.mockResolvedValue(mockUser);

    await expect(handler.execute(command)).rejects.toThrow(InvalidCredentialsException);
    expect(sessionContract.persist).not.toHaveBeenCalled();
  });

  it('should throw InvalidCredentialsException when user has no password (social-only)', async () => {
    const command = new SignInCommand('social@example.com', 'Password1');
    const mockUser = UserMother.createSocialOnly({
      id: 1,
      email: 'social@example.com',
      username: 'socialuser',
    });

    mediatorService.findUserByEmailOrUsername.mockResolvedValue(mockUser);

    await expect(handler.execute(command)).rejects.toThrow(InvalidCredentialsException);
    expect(sessionContract.persist).not.toHaveBeenCalled();
  });

  it('should throw AccountDeactivatedException when user is archived', async () => {
    const command = new SignInCommand('archived@example.com', 'Password1');
    const mockUser = UserMother.createArchived({
      id: 1,
      email: 'archived@example.com',
      username: 'archiveduser',
      passwordHash: validPasswordHash,
    });

    mediatorService.findUserByEmailOrUsername.mockResolvedValue(mockUser);

    await expect(handler.execute(command)).rejects.toThrow(AccountDeactivatedException);
    expect(sessionContract.persist).not.toHaveBeenCalled();
  });
});
