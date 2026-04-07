import { EventPublisher } from '@nestjs/cqrs';
import { ForgotPasswordHandler } from '@authentication/application/commands/forgot-password/forgot-password.handler';
import { ForgotPasswordCommand } from '@authentication/application/commands/forgot-password/forgot-password.command';
import { IPasswordResetTokenContract } from '@authentication/domain/contracts/password-reset-token.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GENERIC_MESSAGE = 'If an account exists, a reset link has been sent';

function buildCommand(): ForgotPasswordCommand {
  return {
    email: 'test@example.com',
    lang: 'en',
  } as ForgotPasswordCommand;
}

function buildUser(): UserAggregate {
  return { uuid: 'user-uuid-123' } as unknown as UserAggregate;
}

function buildCredential(
  overrides: {
    id?: number | null;
    hasPassword?: boolean;
    createdWith?: string;
  } = {},
): CredentialAccountModel {
  const obj: Record<string, unknown> = {
    hasPassword: jest.fn().mockReturnValue(overrides.hasPassword ?? true),
    createdWith: overrides.createdWith ?? null,
  };
  if ('id' in overrides) {
    obj.id = overrides.id;
  } else {
    obj.id = 10;
  }
  return obj as unknown as CredentialAccountModel;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ForgotPasswordHandler', () => {
  let handler: ForgotPasswordHandler;
  let mediator: jest.Mocked<MediatorService>;
  let eventPublisher: jest.Mocked<EventPublisher>;
  let passwordResetTokenContract: jest.Mocked<IPasswordResetTokenContract>;

  beforeEach(() => {
    mediator = {
      user: { findUserByEmail: jest.fn() },
    } as unknown as jest.Mocked<MediatorService>;

    eventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj: unknown) => obj),
    } as unknown as jest.Mocked<EventPublisher>;

    passwordResetTokenContract = {
      persist: jest.fn().mockResolvedValue(undefined),
      findByTokenHash: jest.fn(),
      invalidateForCredential: jest.fn(),
    } as unknown as jest.Mocked<IPasswordResetTokenContract>;

    handler = new ForgotPasswordHandler(mediator, eventPublisher, passwordResetTokenContract);
  });

  describe('Given the email does not belong to any registered user', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue(null);
      });

      it('Then it returns the generic message without leaking user existence', async () => {
        const result = await handler.execute(buildCommand());

        expect(result).toEqual({ message: GENERIC_MESSAGE });
        expect(passwordResetTokenContract.persist).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the user is found but credential has no id', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential({ id: null }),
        });
      });

      it('Then it returns the generic message without persisting a token', async () => {
        const result = await handler.execute(buildCommand());

        expect(result).toEqual({ message: GENERIC_MESSAGE });
        expect(passwordResetTokenContract.persist).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a valid user with a credential-based account', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential({ hasPassword: true }),
        });
      });

      it('Then it returns the generic message', async () => {
        const result = await handler.execute(buildCommand());

        expect(result).toEqual({ message: GENERIC_MESSAGE });
      });

      it('Then it persists a reset token', async () => {
        await handler.execute(buildCommand());

        expect(passwordResetTokenContract.persist).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given a valid user with a social (OAuth) account', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        (mediator.user.findUserByEmail as jest.Mock).mockResolvedValue({
          user: buildUser(),
          credential: buildCredential({ hasPassword: false, createdWith: 'google' }),
        });
      });

      it('Then it returns the generic message', async () => {
        const result = await handler.execute(buildCommand());

        expect(result).toEqual({ message: GENERIC_MESSAGE });
      });

      it('Then it persists a reset token marked as social account', async () => {
        await handler.execute(buildCommand());

        expect(passwordResetTokenContract.persist).toHaveBeenCalledTimes(1);
      });
    });
  });
});
