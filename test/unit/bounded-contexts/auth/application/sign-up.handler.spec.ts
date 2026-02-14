import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventPublisher, EventBus } from '@nestjs/cqrs';
import { SignUpHandler } from '@/auth/application/commands/sign-up/sign-up.handler';
import { SignUpCommand } from '@/auth/application/commands/sign-up/sign-up.command';
import { MediatorService } from '@/shared/infrastructure/mediator/mediator.service';
import { ISessionContract } from '@/auth/domain/contracts/session.contract';
import { IEmailVerificationTokenContract } from '@/auth/domain/contracts/email-verification-token.contract';
import { ICodeGeneratorContract } from '@/shared/domain/contracts/code-generator.contract';
import { IEmailProviderContract } from '@/shared/infrastructure/email/contracts/email-provider.contract';
import { EmailAlreadyExistsException } from '@/auth/domain/exceptions/email-already-exists.exception';
import { UsernameAlreadyExistsException } from '@/auth/domain/exceptions/username-already-exists.exception';
import { INJECTION_TOKENS } from '@/common/constants/app.constants';
import { UserMother } from '../../../../helpers/object-mother/user.mother';

describe('SignUpHandler', () => {
  let handler: SignUpHandler;
  let mediatorService: jest.Mocked<MediatorService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let sessionContract: jest.Mocked<ISessionContract>;
  let verificationTokenContract: jest.Mocked<IEmailVerificationTokenContract>;
  let codeGenerator: jest.Mocked<ICodeGeneratorContract>;
  let emailProvider: jest.Mocked<IEmailProviderContract>;

  const configValues: Record<string, string | number> = {
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_ACCESS_EXPIRATION: '15m',
    JWT_REFRESH_EXPIRATION: '7d',
    VERIFICATION_CODE_EXPIRATION_MINUTES: 10,
  };

  beforeEach(async () => {
    const mockMediatorService = {
      findUserByEmail: jest.fn(),
      existsUserByUsername: jest.fn(),
      createUser: jest.fn(),
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

    const mockEmailProvider = {
      sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
      sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
      sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const mockEventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj) => obj),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignUpHandler,
        { provide: MediatorService, useValue: mockMediatorService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventPublisher, useValue: mockEventPublisher },
        { provide: EventBus, useValue: mockEventBus },
        { provide: INJECTION_TOKENS.SESSION_CONTRACT, useValue: mockSessionContract },
        {
          provide: INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT,
          useValue: mockVerificationTokenContract,
        },
        { provide: INJECTION_TOKENS.CODE_GENERATOR_CONTRACT, useValue: mockCodeGenerator },
        { provide: INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT, useValue: mockEmailProvider },
      ],
    }).compile();

    handler = module.get<SignUpHandler>(SignUpHandler);
    mediatorService = module.get(MediatorService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    sessionContract = module.get(INJECTION_TOKENS.SESSION_CONTRACT);
    verificationTokenContract = module.get(INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT);
    codeGenerator = module.get(INJECTION_TOKENS.CODE_GENERATOR_CONTRACT);
    emailProvider = module.get(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT);

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

    mediatorService.findUserByEmail.mockResolvedValue(null);
    mediatorService.existsUserByUsername.mockResolvedValue(false);
    mediatorService.createUser.mockResolvedValue(mockUser);
    sessionContract.persist.mockResolvedValue(expect.anything());
    verificationTokenContract.persist.mockResolvedValue(expect.anything());

    const result = await handler.execute(command);

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(result.accessToken).toBe('mock-token');
    expect(result.refreshToken).toBe('mock-token');
    expect(result.emailVerificationRequired).toBe(true);
    expect(mediatorService.createUser).toHaveBeenCalledWith(
      'test@example.com',
      'testuser',
      expect.any(String), // hashed password
    );
    expect(sessionContract.persist).toHaveBeenCalled();
    expect(verificationTokenContract.persist).toHaveBeenCalled();
    expect(codeGenerator.generateVerificationCode).toHaveBeenCalled();
    expect(emailProvider.sendVerificationEmail).toHaveBeenCalledWith(
      'test@example.com',
      'ABC123',
      'testuser',
    );
  });

  it('should throw EmailAlreadyExistsException when email is taken', async () => {
    const command = new SignUpCommand('existing@example.com', 'testuser', 'Password1');
    const existingUser = UserMother.create({ email: 'existing@example.com' });

    mediatorService.findUserByEmail.mockResolvedValue(existingUser);

    await expect(handler.execute(command)).rejects.toThrow(EmailAlreadyExistsException);
    expect(mediatorService.createUser).not.toHaveBeenCalled();
  });

  it('should throw UsernameAlreadyExistsException when username is taken', async () => {
    const command = new SignUpCommand('test@example.com', 'existinguser', 'Password1');

    mediatorService.findUserByEmail.mockResolvedValue(null);
    mediatorService.existsUserByUsername.mockResolvedValue(true);

    await expect(handler.execute(command)).rejects.toThrow(UsernameAlreadyExistsException);
    expect(mediatorService.createUser).not.toHaveBeenCalled();
  });

  it('should throw error when password is invalid (no uppercase)', async () => {
    const command = new SignUpCommand('test@example.com', 'testuser', 'password1');

    await expect(handler.execute(command)).rejects.toThrow();
    expect(mediatorService.findUserByEmail).not.toHaveBeenCalled();
  });

  it('should throw error when password is invalid (no number)', async () => {
    const command = new SignUpCommand('test@example.com', 'testuser', 'Password');

    await expect(handler.execute(command)).rejects.toThrow();
    expect(mediatorService.findUserByEmail).not.toHaveBeenCalled();
  });

  it('should throw error when password is too short', async () => {
    const command = new SignUpCommand('test@example.com', 'testuser', 'Pass1');

    await expect(handler.execute(command)).rejects.toThrow();
    expect(mediatorService.findUserByEmail).not.toHaveBeenCalled();
  });
});
