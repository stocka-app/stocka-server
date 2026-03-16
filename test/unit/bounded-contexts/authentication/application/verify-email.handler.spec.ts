import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { VerifyEmailHandler } from '@authentication/application/commands/verify-email/verify-email.handler';
import { VerifyEmailCommand } from '@authentication/application/commands/verify-email/verify-email.command';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { IEmailVerificationTokenContract } from '@authentication/domain/contracts/email-verification-token.contract';
import { ICodeGeneratorContract } from '@shared/domain/contracts/code-generator.contract';
import { InvalidVerificationCodeException } from '@authentication/domain/exceptions/invalid-verification-code.exception';
import { VerificationCodeExpiredException } from '@authentication/domain/exceptions/verification-code-expired.exception';
import { UserAlreadyVerifiedException } from '@authentication/domain/exceptions/user-already-verified.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother, CredentialAccountMother } from '@test/helpers/object-mother/user.mother';
import { EmailVerificationTokenModel } from '@authentication/domain/models/email-verification-token.model';

describe('VerifyEmailHandler', () => {
  let handler: VerifyEmailHandler;
  let mediatorService: { user: { findUserByEmail: jest.Mock } };
  let tokenContract: jest.Mocked<IEmailVerificationTokenContract>;
  let codeGenerator: jest.Mocked<ICodeGeneratorContract>;
  let eventPublisher: jest.Mocked<EventPublisher>;
  let uow: { begin: jest.Mock; commit: jest.Mock; rollback: jest.Mock };

  const MOCK_USER = UserMother.create({ id: 1, uuid: '550e8400-e29b-41d4-a716-446655440002' });

  const createMockToken = (
    overrides: Partial<{
      id: number;
      uuid: string;
      credentialAccountId: number;
      codeHash: string;
      expiresAt: Date;
      usedAt: Date | null;
    }> = {},
  ): EmailVerificationTokenModel => {
    const defaults = {
      id: 1,
      uuid: '550e8400-e29b-41d4-a716-446655440099',
      credentialAccountId: 1,
      codeHash: 'hashed-code-123',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      usedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    };

    const props = { ...defaults, ...overrides };

    return EmailVerificationTokenModel.reconstitute({
      id: props.id,
      uuid: props.uuid,
      credentialAccountId: props.credentialAccountId,
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
      user: {
        findUserByEmail: jest.fn(),
      },
    };

    const mockTokenContract = {
      findActiveByCredentialAccountId: jest.fn(),
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

    const mockUow = {
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyEmailHandler,
        { provide: MediatorService, useValue: mockMediatorService },
        { provide: EventPublisher, useValue: mockEventPublisher },
        {
          provide: INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT,
          useValue: mockTokenContract,
        },
        { provide: INJECTION_TOKENS.CODE_GENERATOR_CONTRACT, useValue: mockCodeGenerator },
        { provide: INJECTION_TOKENS.UNIT_OF_WORK, useValue: mockUow },
      ],
    }).compile();

    handler = module.get<VerifyEmailHandler>(VerifyEmailHandler);
    mediatorService = module.get(MediatorService);
    tokenContract = module.get(INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT);
    codeGenerator = module.get(INJECTION_TOKENS.CODE_GENERATOR_CONTRACT);
    eventPublisher = module.get(EventPublisher);
    uow = module.get(INJECTION_TOKENS.UNIT_OF_WORK);
  });

  describe('execute', () => {
    it('should successfully verify email with valid code', async () => {
      const command = new VerifyEmailCommand('test@example.com', 'ABC123');
      const mockCredential = CredentialAccountMother.createPendingVerification({
        id: 1,
        email: 'test@example.com',
      });
      const mockToken = createMockToken({ credentialAccountId: 1, codeHash: 'valid-hash' });

      mediatorService.user.findUserByEmail.mockResolvedValue({
        user: MOCK_USER,
        credential: mockCredential,
      });
      tokenContract.findActiveByCredentialAccountId.mockResolvedValue(mockToken);
      codeGenerator.hashCode.mockReturnValue('valid-hash');
      tokenContract.persist.mockResolvedValue({} as EmailVerificationTokenModel);

      const result = await handler.execute(command);

      expect(result.isOk()).toBe(true);
      const data = result._unsafeUnwrap();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Email verified successfully');
      expect(tokenContract.persist).toHaveBeenCalled();
    });

    it('should return InvalidVerificationCodeException error when user not found', async () => {
      const command = new VerifyEmailCommand('nonexistent@example.com', 'ABC123');

      mediatorService.user.findUserByEmail.mockResolvedValue(null);

      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidVerificationCodeException);
      expect(tokenContract.findActiveByCredentialAccountId).not.toHaveBeenCalled();
    });

    it('should return UserAlreadyVerifiedException error when user is already verified', async () => {
      const command = new VerifyEmailCommand('verified@example.com', 'ABC123');
      const mockCredential = CredentialAccountMother.createVerified({
        id: 1,
        email: 'verified@example.com',
      });

      mediatorService.user.findUserByEmail.mockResolvedValue({
        user: MOCK_USER,
        credential: mockCredential,
      });

      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(UserAlreadyVerifiedException);
      expect(tokenContract.findActiveByCredentialAccountId).not.toHaveBeenCalled();
    });

    it('should return InvalidVerificationCodeException error when no active token exists', async () => {
      const command = new VerifyEmailCommand('test@example.com', 'ABC123');
      const mockCredential = CredentialAccountMother.createPendingVerification({
        id: 1,
        email: 'test@example.com',
      });

      mediatorService.user.findUserByEmail.mockResolvedValue({
        user: MOCK_USER,
        credential: mockCredential,
      });
      tokenContract.findActiveByCredentialAccountId.mockResolvedValue(null);

      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidVerificationCodeException);
    });

    it('should return VerificationCodeExpiredException error when token is expired', async () => {
      const command = new VerifyEmailCommand('test@example.com', 'ABC123');
      const mockCredential = CredentialAccountMother.createPendingVerification({
        id: 1,
        email: 'test@example.com',
      });
      const expiredToken = createMockToken({
        credentialAccountId: 1,
        codeHash: 'valid-hash',
        expiresAt: new Date(Date.now() - 1000),
      });

      mediatorService.user.findUserByEmail.mockResolvedValue({
        user: MOCK_USER,
        credential: mockCredential,
      });
      tokenContract.findActiveByCredentialAccountId.mockResolvedValue(expiredToken);

      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(VerificationCodeExpiredException);
    });

    it('should return InvalidVerificationCodeException error when code does not match', async () => {
      const command = new VerifyEmailCommand('test@example.com', 'WRONG1');
      const mockCredential = CredentialAccountMother.createPendingVerification({
        id: 1,
        email: 'test@example.com',
      });
      const mockToken = createMockToken({ credentialAccountId: 1, codeHash: 'correct-hash' });

      mediatorService.user.findUserByEmail.mockResolvedValue({
        user: MOCK_USER,
        credential: mockCredential,
      });
      tokenContract.findActiveByCredentialAccountId.mockResolvedValue(mockToken);
      codeGenerator.hashCode.mockReturnValue('wrong-hash');

      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidVerificationCodeException);
    });

    it('should convert code to uppercase before hashing', async () => {
      const command = new VerifyEmailCommand('test@example.com', 'abc123');
      const mockCredential = CredentialAccountMother.createPendingVerification({
        id: 1,
        email: 'test@example.com',
      });
      const mockToken = createMockToken({ credentialAccountId: 1, codeHash: 'valid-hash' });

      mediatorService.user.findUserByEmail.mockResolvedValue({
        user: MOCK_USER,
        credential: mockCredential,
      });
      tokenContract.findActiveByCredentialAccountId.mockResolvedValue(mockToken);
      codeGenerator.hashCode.mockReturnValue('valid-hash');
      tokenContract.persist.mockResolvedValue({} as EmailVerificationTokenModel);

      await handler.execute(command);

      expect(codeGenerator.hashCode).toHaveBeenCalledWith('ABC123');
    });

    it('should mark token as used after successful verification', async () => {
      const command = new VerifyEmailCommand('test@example.com', 'ABC123');
      const mockCredential = CredentialAccountMother.createPendingVerification({
        id: 1,
        email: 'test@example.com',
      });
      const mockToken = createMockToken({ credentialAccountId: 1, codeHash: 'valid-hash' });

      mediatorService.user.findUserByEmail.mockResolvedValue({
        user: MOCK_USER,
        credential: mockCredential,
      });
      tokenContract.findActiveByCredentialAccountId.mockResolvedValue(mockToken);
      codeGenerator.hashCode.mockReturnValue('valid-hash');
      tokenContract.persist.mockResolvedValue({} as EmailVerificationTokenModel);

      await handler.execute(command);

      expect(eventPublisher.mergeObjectContext).toHaveBeenCalledWith(mockToken);
      expect(tokenContract.persist).toHaveBeenCalled();
    });
  });

  describe('regression: handler does NOT contain rate limiting logic', () => {
    it('should NOT inject VERIFICATION_ATTEMPT_CONTRACT', () => {
      const handlerKeys = Object.keys(handler);
      expect(handlerKeys).not.toContain('attemptContract');
      expect(handlerKeys).not.toContain('verificationAttemptContract');
    });

    it('should only use domain logic dependencies', () => {
      const privateProps = Object.getOwnPropertyNames(handler).filter(
        (key) => key.startsWith('_') || !['constructor', 'execute'].includes(key),
      );

      expect(privateProps.some((p) => p.toLowerCase().includes('attempt'))).toBe(false);
      expect(privateProps.some((p) => p.toLowerCase().includes('ratelimit'))).toBe(false);
      expect(privateProps.some((p) => p.toLowerCase().includes('block'))).toBe(false);
    });

    it('should return domain exception errors without tracking attempts', async () => {
      const command = new VerifyEmailCommand('test@example.com', 'WRONG1');
      const mockCredential = CredentialAccountMother.createPendingVerification({
        id: 1,
        email: 'test@example.com',
      });
      const mockToken = createMockToken({ credentialAccountId: 1, codeHash: 'correct-hash' });

      mediatorService.user.findUserByEmail.mockResolvedValue({
        user: MOCK_USER,
        credential: mockCredential,
      });
      tokenContract.findActiveByCredentialAccountId.mockResolvedValue(mockToken);
      codeGenerator.hashCode.mockReturnValue('wrong-hash');

      const result = await handler.execute(command);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidVerificationCodeException);
    });
  });
});
