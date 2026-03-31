import { EventPublisher } from '@nestjs/cqrs';
import { VerifyEmailHandler } from '@authentication/application/commands/verify-email/verify-email.handler';
import { VerifyEmailCommand } from '@authentication/application/commands/verify-email/verify-email.command';
import { IEmailVerificationTokenContract } from '@authentication/domain/contracts/email-verification-token.contract';
import { ICodeGeneratorContract } from '@shared/domain/contracts/code-generator.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { EmailVerificationTokenModel } from '@authentication/domain/models/email-verification-token.model';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { InvalidVerificationCodeException } from '@authentication/domain/exceptions/invalid-verification-code.exception';
import { UserAlreadyVerifiedException } from '@authentication/domain/exceptions/user-already-verified.exception';
import { VerificationCodeExpiredException } from '@authentication/domain/exceptions/verification-code-expired.exception';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCommand(overrides: Partial<VerifyEmailCommand> = {}): VerifyEmailCommand {
  return {
    email: 'test@example.com',
    code: 'ABC123',
    lang: 'en',
    ...overrides,
  } as VerifyEmailCommand;
}

function buildUser(): UserAggregate {
  return { uuid: 'user-uuid-123' } as unknown as UserAggregate;
}

function buildCredential(overrides: {
  id?: number | null;
  requiresEmailVerification?: boolean;
} = {}): CredentialAccountModel {
  const obj: Record<string, unknown> = {
    requiresEmailVerification: jest.fn().mockReturnValue(
      overrides.requiresEmailVerification ?? true,
    ),
  };
  if ('id' in overrides) {
    obj.id = overrides.id;
  } else {
    obj.id = 10;
  }
  return obj as unknown as CredentialAccountModel;
}

function buildToken(overrides: {
  isExpired?: boolean;
  codeHash?: string;
} = {}): EmailVerificationTokenModel {
  return {
    codeHash: overrides.codeHash ?? 'hashed-ABC123',
    isExpired: jest.fn().mockReturnValue(overrides.isExpired ?? false),
    markAsUsed: jest.fn(),
    commit: jest.fn(),
  } as unknown as EmailVerificationTokenModel;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VerifyEmailHandler', () => {
  let handler: VerifyEmailHandler;
  let mediator: jest.Mocked<MediatorService>;
  let eventPublisher: jest.Mocked<EventPublisher>;
  let tokenContract: jest.Mocked<IEmailVerificationTokenContract>;
  let codeGenerator: jest.Mocked<ICodeGeneratorContract>;

  beforeEach(() => {
    mediator = {
      user: { findUserByEmail: jest.fn() },
    } as unknown as jest.Mocked<MediatorService>;

    eventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj: unknown) => obj),
    } as unknown as jest.Mocked<EventPublisher>;

    tokenContract = {
      findActiveByCredentialAccountId: jest.fn(),
      persist: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IEmailVerificationTokenContract>;

    codeGenerator = {
      hashCode: jest.fn().mockReturnValue('hashed-ABC123'),
      generateVerificationCode: jest.fn(),
    } as unknown as jest.Mocked<ICodeGeneratorContract>;

    handler = new VerifyEmailHandler(mediator, eventPublisher, tokenContract, codeGenerator);
  });

  describe('Given the email does not belong to any user', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue(null);
      });

      it('Then it returns an err with InvalidVerificationCodeException', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidVerificationCodeException);
      });
    });
  });

  describe('Given the user is already verified', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential({ requiresEmailVerification: false }),
        });
      });

      it('Then it returns an err with UserAlreadyVerifiedException', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(UserAlreadyVerifiedException);
      });
    });
  });

  describe('Given the credential has no id', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential({ id: null }),
        });
      });

      it('Then it returns an err with InvalidVerificationCodeException', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidVerificationCodeException);
      });
    });
  });

  describe('Given no active verification token exists', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential(),
        });
        tokenContract.findActiveByCredentialAccountId.mockResolvedValue(null);
      });

      it('Then it returns an err with InvalidVerificationCodeException', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidVerificationCodeException);
      });
    });
  });

  describe('Given the verification token is expired', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential(),
        });
        tokenContract.findActiveByCredentialAccountId.mockResolvedValue(
          buildToken({ isExpired: true }),
        );
      });

      it('Then it returns an err with VerificationCodeExpiredException', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(VerificationCodeExpiredException);
      });
    });
  });

  describe('Given the code does not match the stored hash', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential(),
        });
        tokenContract.findActiveByCredentialAccountId.mockResolvedValue(
          buildToken({ codeHash: 'different-hash' }),
        );
        codeGenerator.hashCode.mockReturnValue('hashed-ABC123'); // will not match 'different-hash'
      });

      it('Then it returns an err with InvalidVerificationCodeException', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidVerificationCodeException);
      });
    });
  });

  describe('Given a valid, unexpired token with matching code', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential(),
        });
        tokenContract.findActiveByCredentialAccountId.mockResolvedValue(
          buildToken({ codeHash: 'hashed-ABC123' }),
        );
        codeGenerator.hashCode.mockReturnValue('hashed-ABC123');
      });

      it('Then it returns ok with success', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toEqual({
          success: true,
          message: 'Email verified successfully',
        });
      });
    });
  });
});
