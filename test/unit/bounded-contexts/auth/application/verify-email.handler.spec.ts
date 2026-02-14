import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { VerifyEmailHandler } from '@/auth/application/commands/verify-email/verify-email.handler';
import { VerifyEmailCommand } from '@/auth/application/commands/verify-email/verify-email.command';
import { MediatorService } from '@/shared/infrastructure/mediator/mediator.service';
import { IEmailVerificationTokenContract } from '@/auth/domain/contracts/email-verification-token.contract';
import { ICodeGeneratorContract } from '@/shared/domain/contracts/code-generator.contract';
import { InvalidVerificationCodeException } from '@/auth/domain/exceptions/invalid-verification-code.exception';
import { VerificationCodeExpiredException } from '@/auth/domain/exceptions/verification-code-expired.exception';
import { UserAlreadyVerifiedException } from '@/auth/domain/exceptions/user-already-verified.exception';
import { INJECTION_TOKENS } from '@/common/constants/app.constants';
import { UserMother } from '../../../../helpers/object-mother/user.mother';
import { EmailVerificationTokenModel } from '@/auth/domain/models/email-verification-token.model';

describe('VerifyEmailHandler', () => {
  let handler: VerifyEmailHandler;
  let mediatorService: jest.Mocked<MediatorService>;
  let tokenContract: jest.Mocked<IEmailVerificationTokenContract>;
  let codeGenerator: jest.Mocked<ICodeGeneratorContract>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  const createMockToken = (overrides: Partial<{
    id: number;
    uuid: string;
    userId: number;
    codeHash: string;
    expiresAt: Date;
    usedAt: Date | null;
  }> = {}): EmailVerificationTokenModel => {
    const defaults = {
      id: 1,
      uuid: '550e8400-e29b-41d4-a716-446655440099',
      userId: 1,
      codeHash: 'hashed-code-123',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      usedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    };

    const props = { ...defaults, ...overrides };

    return EmailVerificationTokenModel.reconstitute({
      id: props.id,
      uuid: props.uuid,
      userId: props.userId,
      codeHash: props.codeHash,
      expiresAt: props.expiresAt,
      usedAt: props.usedAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    });
  };

  beforeEach(async () => {
    const mockMediatorService = {
      findUserByEmail: jest.fn(),
      verifyUserEmail: jest.fn(),
    };

    const mockTokenContract = {
      findActiveByUserId: jest.fn(),
      persist: jest.fn(),
    };

    const mockCodeGenerator = {
      hashCode: jest.fn(),
      generateVerificationCode: jest.fn(),
      generateSecureToken: jest.fn(),
    };

    const mockEventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj) => {
        obj.commit = jest.fn();
        return obj;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyEmailHandler,
        { provide: MediatorService, useValue: mockMediatorService },
        { provide: EventPublisher, useValue: mockEventPublisher },
        { provide: INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT, useValue: mockTokenContract },
        { provide: INJECTION_TOKENS.CODE_GENERATOR_CONTRACT, useValue: mockCodeGenerator },
      ],
    }).compile();

    handler = module.get<VerifyEmailHandler>(VerifyEmailHandler);
    mediatorService = module.get(MediatorService);
    tokenContract = module.get(INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT);
    codeGenerator = module.get(INJECTION_TOKENS.CODE_GENERATOR_CONTRACT);
    eventPublisher = module.get(EventPublisher);
  });

  describe('execute', () => {
    it('should successfully verify email with valid code', async () => {
      const command = new VerifyEmailCommand('test@example.com', 'ABC123');
      const mockUser = UserMother.createPendingVerification({
        id: 1,
        email: 'test@example.com',
      });
      const mockToken = createMockToken({
        userId: 1,
        codeHash: 'valid-hash',
      });

      mediatorService.findUserByEmail.mockResolvedValue(mockUser);
      tokenContract.findActiveByUserId.mockResolvedValue(mockToken);
      codeGenerator.hashCode.mockReturnValue('valid-hash');
      tokenContract.persist.mockResolvedValue({} as EmailVerificationTokenModel);
      mediatorService.verifyUserEmail.mockResolvedValue(undefined);

      const result = await handler.execute(command);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email verified successfully');
      expect(mediatorService.verifyUserEmail).toHaveBeenCalledWith(mockUser.uuid);
      expect(tokenContract.persist).toHaveBeenCalled();
    });

    it('should throw InvalidVerificationCodeException when user not found', async () => {
      const command = new VerifyEmailCommand('nonexistent@example.com', 'ABC123');

      mediatorService.findUserByEmail.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(InvalidVerificationCodeException);
      expect(tokenContract.findActiveByUserId).not.toHaveBeenCalled();
    });

    it('should throw UserAlreadyVerifiedException when user is already verified', async () => {
      const command = new VerifyEmailCommand('verified@example.com', 'ABC123');
      const mockUser = UserMother.createVerified({
        id: 1,
        email: 'verified@example.com',
      });

      mediatorService.findUserByEmail.mockResolvedValue(mockUser);

      await expect(handler.execute(command)).rejects.toThrow(UserAlreadyVerifiedException);
      expect(tokenContract.findActiveByUserId).not.toHaveBeenCalled();
    });

    it('should throw InvalidVerificationCodeException when no active token exists', async () => {
      const command = new VerifyEmailCommand('test@example.com', 'ABC123');
      const mockUser = UserMother.createPendingVerification({
        id: 1,
        email: 'test@example.com',
      });

      mediatorService.findUserByEmail.mockResolvedValue(mockUser);
      tokenContract.findActiveByUserId.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(InvalidVerificationCodeException);
    });

    it('should throw VerificationCodeExpiredException when token is expired', async () => {
      const command = new VerifyEmailCommand('test@example.com', 'ABC123');
      const mockUser = UserMother.createPendingVerification({
        id: 1,
        email: 'test@example.com',
      });
      const expiredToken = createMockToken({
        userId: 1,
        codeHash: 'valid-hash',
        expiresAt: new Date(Date.now() - 1000), // Already expired
      });

      mediatorService.findUserByEmail.mockResolvedValue(mockUser);
      tokenContract.findActiveByUserId.mockResolvedValue(expiredToken);

      await expect(handler.execute(command)).rejects.toThrow(VerificationCodeExpiredException);
    });

    it('should throw InvalidVerificationCodeException when code does not match', async () => {
      const command = new VerifyEmailCommand('test@example.com', 'WRONG1');
      const mockUser = UserMother.createPendingVerification({
        id: 1,
        email: 'test@example.com',
      });
      const mockToken = createMockToken({
        userId: 1,
        codeHash: 'correct-hash',
      });

      mediatorService.findUserByEmail.mockResolvedValue(mockUser);
      tokenContract.findActiveByUserId.mockResolvedValue(mockToken);
      codeGenerator.hashCode.mockReturnValue('wrong-hash');

      await expect(handler.execute(command)).rejects.toThrow(InvalidVerificationCodeException);
      expect(mediatorService.verifyUserEmail).not.toHaveBeenCalled();
    });

    it('should convert code to uppercase before hashing', async () => {
      const command = new VerifyEmailCommand('test@example.com', 'abc123');
      const mockUser = UserMother.createPendingVerification({
        id: 1,
        email: 'test@example.com',
      });
      const mockToken = createMockToken({
        userId: 1,
        codeHash: 'valid-hash',
      });

      mediatorService.findUserByEmail.mockResolvedValue(mockUser);
      tokenContract.findActiveByUserId.mockResolvedValue(mockToken);
      codeGenerator.hashCode.mockReturnValue('valid-hash');
      tokenContract.persist.mockResolvedValue({} as EmailVerificationTokenModel);
      mediatorService.verifyUserEmail.mockResolvedValue(undefined);

      await handler.execute(command);

      expect(codeGenerator.hashCode).toHaveBeenCalledWith('ABC123');
    });

    it('should mark token as used after successful verification', async () => {
      const command = new VerifyEmailCommand('test@example.com', 'ABC123');
      const mockUser = UserMother.createPendingVerification({
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440002',
        email: 'test@example.com',
      });
      const mockToken = createMockToken({
        userId: 1,
        codeHash: 'valid-hash',
      });

      mediatorService.findUserByEmail.mockResolvedValue(mockUser);
      tokenContract.findActiveByUserId.mockResolvedValue(mockToken);
      codeGenerator.hashCode.mockReturnValue('valid-hash');
      tokenContract.persist.mockResolvedValue({} as EmailVerificationTokenModel);
      mediatorService.verifyUserEmail.mockResolvedValue(undefined);

      await handler.execute(command);

      expect(eventPublisher.mergeObjectContext).toHaveBeenCalledWith(mockToken);
      expect(tokenContract.persist).toHaveBeenCalled();
    });
  });

  describe('regression: handler does NOT contain rate limiting logic', () => {
    it('should NOT inject VERIFICATION_ATTEMPT_CONTRACT', () => {
      // The handler should not have any verification attempt tracking
      // This is a structural test to ensure rate limiting was removed
      const handlerKeys = Object.keys(handler);
      expect(handlerKeys).not.toContain('attemptContract');
      expect(handlerKeys).not.toContain('verificationAttemptContract');
    });

    it('should only use domain logic dependencies', () => {
      // Verify handler only has the expected dependencies
      // mediator, eventPublisher, tokenContract, codeGenerator
      const privateProps = Object.getOwnPropertyNames(handler).filter(
        (key) => key.startsWith('_') || !['constructor', 'execute'].includes(key),
      );

      // Should not have any rate limiting related properties
      expect(privateProps.some((p) => p.toLowerCase().includes('attempt'))).toBe(false);
      expect(privateProps.some((p) => p.toLowerCase().includes('ratelimit'))).toBe(false);
      expect(privateProps.some((p) => p.toLowerCase().includes('block'))).toBe(false);
    });

    it('should throw domain exceptions without tracking attempts', async () => {
      const command = new VerifyEmailCommand('test@example.com', 'WRONG1');
      const mockUser = UserMother.createPendingVerification({
        id: 1,
        email: 'test@example.com',
      });
      const mockToken = createMockToken({
        userId: 1,
        codeHash: 'correct-hash',
      });

      mediatorService.findUserByEmail.mockResolvedValue(mockUser);
      tokenContract.findActiveByUserId.mockResolvedValue(mockToken);
      codeGenerator.hashCode.mockReturnValue('wrong-hash');

      // Should throw the exception cleanly without any side effects
      // Rate limiting is now handled by RateLimitInterceptor
      await expect(handler.execute(command)).rejects.toThrow(InvalidVerificationCodeException);

      // Verify no verification tracking occurred in the handler
      // The mediator should NOT have been called for blocking
      expect(mediatorService.verifyUserEmail).not.toHaveBeenCalled();
    });
  });
});
