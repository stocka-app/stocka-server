import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventBus } from '@nestjs/cqrs';
import { SignUpHandler } from '@auth/application/commands/sign-up/sign-up.handler';
import { SignUpCommand } from '@auth/application/commands/sign-up/sign-up.command';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { ISessionContract } from '@auth/domain/contracts/session.contract';
import { IEmailVerificationTokenContract } from '@auth/domain/contracts/email-verification-token.contract';
import { ICodeGeneratorContract } from '@shared/domain/contracts/code-generator.contract';
import { EmailAlreadyExistsException } from '@auth/domain/exceptions/email-already-exists.exception';
import { UsernameAlreadyExistsException } from '@auth/domain/exceptions/username-already-exists.exception';
import { InvalidPasswordException } from '@auth/domain/exceptions/invalid-password.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

describe('SignUpHandler', () => {
  let handler: SignUpHandler;
  let mediatorService: {
    user: { findByEmail: jest.Mock; existsByUsername: jest.Mock; createUser: jest.Mock };
  };
  let jwtService: jest.Mocked<JwtService>;
  let sessionContract: jest.Mocked<ISessionContract>;
  let verificationTokenContract: jest.Mocked<IEmailVerificationTokenContract>;
  let codeGenerator: jest.Mocked<ICodeGeneratorContract>;
  let eventBus: { publish: jest.Mock };
  let uow: { begin: jest.Mock; commit: jest.Mock; rollback: jest.Mock; getManager: jest.Mock };

  const configValues: Record<string, string | number> = {
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_ACCESS_EXPIRATION: '15m',
    JWT_REFRESH_EXPIRATION: '7d',
    VERIFICATION_CODE_EXPIRATION_MINUTES: 10,
  };

  beforeEach(async () => {
    const mockMediatorService = {
      user: {
        findByEmail: jest.fn(),
        existsByUsername: jest.fn(),
        createUser: jest.fn(),
      },
    };

    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => configValues[key]),
      getOrThrow: jest.fn((key: string) => {
        const value = configValues[key];
        if (value === undefined) {
          throw new Error(`Configuration key "${key}" does not exist`);
        }
        return value;
      }),
    };

    const mockSessionContract = {
      persist: jest.fn(),
    };

    const mockVerificationTokenContract = {
      persist: jest.fn(),
    };

    const mockCodeGenerator = {
      generateVerificationCode: jest.fn().mockReturnValue('ABC123'),
      hashCode: jest.fn().mockReturnValue('hashed-code'),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const mockUow = {
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      getManager: jest.fn().mockReturnValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignUpHandler,
        { provide: MediatorService, useValue: mockMediatorService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventBus, useValue: mockEventBus },
        { provide: INJECTION_TOKENS.SESSION_CONTRACT, useValue: mockSessionContract },
        {
          provide: INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT,
          useValue: mockVerificationTokenContract,
        },
        { provide: INJECTION_TOKENS.CODE_GENERATOR_CONTRACT, useValue: mockCodeGenerator },
        { provide: INJECTION_TOKENS.UNIT_OF_WORK, useValue: mockUow },
      ],
    }).compile();

    handler = module.get<SignUpHandler>(SignUpHandler);
    mediatorService = module.get(MediatorService);
    jwtService = module.get(JwtService);
    sessionContract = module.get(INJECTION_TOKENS.SESSION_CONTRACT);
    verificationTokenContract = module.get(INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT);
    codeGenerator = module.get(INJECTION_TOKENS.CODE_GENERATOR_CONTRACT);
    eventBus = module.get(EventBus);
    uow = module.get(INJECTION_TOKENS.UNIT_OF_WORK);

    // Default JWT signs
    jwtService.signAsync.mockResolvedValue('mock-token');
  });

  it('should successfully register a new user', async () => {
    const command = new SignUpCommand('test@example.com', 'testuser', 'Password1');
    const mockUser = UserMother.create({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
    });

    mediatorService.user.findByEmail.mockResolvedValue(null);
    mediatorService.user.existsByUsername.mockResolvedValue(false);
    mediatorService.user.createUser.mockResolvedValue(mockUser);
    sessionContract.persist.mockResolvedValue(expect.anything());
    verificationTokenContract.persist.mockResolvedValue(expect.anything());

    const result = await handler.execute(command);

    expect(result.isOk()).toBe(true);
    const data = result._unsafeUnwrap();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('test@example.com');
    expect(data.accessToken).toBe('mock-token');
    expect(data.refreshToken).toBe('mock-token');
    expect(data.emailVerificationRequired).toBe(true);
    expect(mediatorService.user.createUser).toHaveBeenCalledWith(
      'test@example.com',
      'testuser',
      expect.any(String), // hashed password
      expect.anything(), // transactionContext (manager)
    );
    expect(uow.begin).toHaveBeenCalled();
    expect(uow.commit).toHaveBeenCalled();
    expect(sessionContract.persist).toHaveBeenCalled();
    expect(verificationTokenContract.persist).toHaveBeenCalled();
    expect(codeGenerator.generateVerificationCode).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should return EmailAlreadyExistsException error when email is taken', async () => {
    const command = new SignUpCommand('existing@example.com', 'testuser', 'Password1');
    const existingUser = UserMother.create({ email: 'existing@example.com' });

    mediatorService.user.findByEmail.mockResolvedValue(existingUser);

    const result = await handler.execute(command);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(EmailAlreadyExistsException);
    expect(mediatorService.user.createUser).not.toHaveBeenCalled();
  });

  it('should return UsernameAlreadyExistsException error when username is taken', async () => {
    const command = new SignUpCommand('test@example.com', 'existinguser', 'Password1');

    mediatorService.user.findByEmail.mockResolvedValue(null);
    mediatorService.user.existsByUsername.mockResolvedValue(true);

    const result = await handler.execute(command);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UsernameAlreadyExistsException);
    expect(mediatorService.user.createUser).not.toHaveBeenCalled();
  });

  it('should return InvalidPasswordException error when password has no uppercase', async () => {
    const command = new SignUpCommand('test@example.com', 'testuser', 'password1');

    const result = await handler.execute(command);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidPasswordException);
    expect(mediatorService.user.findByEmail).not.toHaveBeenCalled();
  });

  it('should return InvalidPasswordException error when password has no number', async () => {
    const command = new SignUpCommand('test@example.com', 'testuser', 'Password');

    const result = await handler.execute(command);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidPasswordException);
    expect(mediatorService.user.findByEmail).not.toHaveBeenCalled();
  });

  it('should return InvalidPasswordException error when password is too short', async () => {
    const command = new SignUpCommand('test@example.com', 'testuser', 'Pass1');

    const result = await handler.execute(command);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidPasswordException);
    expect(mediatorService.user.findByEmail).not.toHaveBeenCalled();
  });
});
