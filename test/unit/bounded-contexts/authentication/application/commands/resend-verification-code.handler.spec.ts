import { EventPublisher } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ResendVerificationCodeHandler } from '@authentication/application/commands/resend-verification-code/resend-verification-code.handler';
import { ResendVerificationCodeCommand } from '@authentication/application/commands/resend-verification-code/resend-verification-code.command';
import { IEmailVerificationTokenContract } from '@authentication/domain/contracts/email-verification-token.contract';
import { ICodeGeneratorContract } from '@shared/domain/contracts/code-generator.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { EmailVerificationTokenAggregate } from '@authentication/domain/aggregates/email-verification-token.aggregate';
import { Persisted } from '@shared/domain/contracts/base-repository.contract';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';
import { UserAggregate } from '@user/domain/aggregates/user.aggregate';
import { UserAlreadyVerifiedException } from '@authentication/domain/exceptions/user-already-verified.exception';
import { ResendCooldownActiveException } from '@authentication/domain/exceptions/resend-cooldown-active.exception';
import { MaxResendsExceededException } from '@authentication/domain/exceptions/max-resends-exceeded.exception';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCommand(): ResendVerificationCodeCommand {
  return {
    email: 'test@example.com',
    lang: 'en',
    ipAddress: '127.0.0.1',
  } as ResendVerificationCodeCommand;
}

function buildUser(): UserAggregate {
  return { uuid: 'user-uuid-123' } as unknown as UserAggregate;
}

function buildCredential(
  overrides: {
    id?: number | null;
    requiresEmailVerification?: boolean;
  } = {},
): CredentialAccountModel {
  const obj: Record<string, unknown> = {
    requiresEmailVerification: jest
      .fn()
      .mockReturnValue(overrides.requiresEmailVerification ?? true),
  };
  if ('id' in overrides) {
    obj.id = overrides.id;
  } else {
    obj.id = 10;
  }
  return obj as unknown as CredentialAccountModel;
}

function buildToken(
  overrides: {
    canResend?: boolean;
    secondsUntilCanResend?: number;
    remainingResends?: number;
    currentCooldownSeconds?: number;
  } = {},
): Persisted<EmailVerificationTokenAggregate> {
  return {
    id: 1,
    canResend: jest.fn().mockReturnValue(overrides.canResend ?? true),
    getSecondsUntilCanResend: jest.fn().mockReturnValue(overrides.secondsUntilCanResend ?? 0),
    getRemainingResends: jest.fn().mockReturnValue(overrides.remainingResends ?? 2),
    getCurrentCooldownSeconds: jest.fn().mockReturnValue(overrides.currentCooldownSeconds ?? 30),
    updateCode: jest.fn(),
    commit: jest.fn(),
  } as unknown as Persisted<EmailVerificationTokenAggregate>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ResendVerificationCodeHandler', () => {
  let handler: ResendVerificationCodeHandler;
  let mediator: jest.Mocked<MediatorService>;
  let configService: jest.Mocked<ConfigService>;
  let eventPublisher: jest.Mocked<EventPublisher>;
  let tokenContract: jest.Mocked<IEmailVerificationTokenContract>;
  let codeGenerator: jest.Mocked<ICodeGeneratorContract>;

  beforeEach(() => {
    mediator = {
      user: { findUserByEmail: jest.fn() },
    } as unknown as jest.Mocked<MediatorService>;

    configService = {
      get: jest.fn().mockReturnValue(10),
    } as unknown as jest.Mocked<ConfigService>;

    eventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj: unknown) => obj),
    } as unknown as jest.Mocked<EventPublisher>;

    tokenContract = {
      findActiveByCredentialAccountId: jest.fn(),
      persist: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IEmailVerificationTokenContract>;

    codeGenerator = {
      generateVerificationCode: jest.fn().mockReturnValue('NEW123'),
      hashCode: jest.fn().mockReturnValue('hashed-NEW123'),
    } as unknown as jest.Mocked<ICodeGeneratorContract>;

    handler = new ResendVerificationCodeHandler(
      mediator,
      configService,
      eventPublisher,
      tokenContract,
      codeGenerator,
    );
  });

  describe('Given the email does not belong to any user', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue(null);
      });

      it('Then it returns ok silently to prevent email enumeration', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().success).toBe(true);
        expect(tokenContract.persist).not.toHaveBeenCalled();
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

      it('Then it returns ok silently', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given an existing token with active cooldown', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential(),
        });
        tokenContract.findActiveByCredentialAccountId.mockResolvedValue(
          buildToken({ canResend: false, secondsUntilCanResend: 45 }),
        );
      });

      it('Then it returns an err with ResendCooldownActiveException', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(ResendCooldownActiveException);
      });
    });
  });

  describe('Given an existing token with no cooldown but max resends exhausted', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential(),
        });
        tokenContract.findActiveByCredentialAccountId.mockResolvedValue(
          buildToken({ canResend: false, secondsUntilCanResend: 0, remainingResends: 0 }),
        );
      });

      it('Then it returns an err with MaxResendsExceededException', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(MaxResendsExceededException);
      });
    });
  });

  describe('Given an existing token with no cooldown, max resends not exhausted, but canResend is false', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential(),
        });
        tokenContract.findActiveByCredentialAccountId.mockResolvedValue(
          buildToken({ canResend: false, secondsUntilCanResend: 0, remainingResends: 2 }),
        );
      });

      it('Then it falls through and returns ok with a regenerated code', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().success).toBe(true);
        expect(tokenContract.persist).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given an existing token that can resend', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential(),
        });
        tokenContract.findActiveByCredentialAccountId.mockResolvedValue(
          buildToken({ canResend: true, currentCooldownSeconds: 30, remainingResends: 2 }),
        );
      });

      it('Then it returns ok with updated token state', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().success).toBe(true);
        expect(tokenContract.persist).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given no existing token for the credential', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential(),
        });
        tokenContract.findActiveByCredentialAccountId.mockResolvedValue(null);

        // EmailVerificationTokenAggregate.createForResend creates a new model in-memory
        // The handler calls getRemainingResends() on the newly created token
        // We need to mock EmailVerificationTokenAggregate.createForResend via the module
      });

      it('Then it creates a new token and returns ok', async () => {
        const result = await handler.execute(buildCommand());

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().success).toBe(true);
        expect(tokenContract.persist).toHaveBeenCalledTimes(1);
      });
    });
  });
});
