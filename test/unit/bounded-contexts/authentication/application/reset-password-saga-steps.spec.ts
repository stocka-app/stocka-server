import { Test, TestingModule } from '@nestjs/testing';
import { EventBus, EventPublisher } from '@nestjs/cqrs';
import { ArchiveUserSessionsStep } from '@authentication/application/sagas/reset-password/steps/reset-password-archive-sessions.saga-step';
import { HashNewPasswordStep } from '@authentication/application/sagas/reset-password/steps/reset-password-hash-password.saga-step';
import { MarkTokenUsedStep } from '@authentication/application/sagas/reset-password/steps/reset-password-mark-token-used.saga-step';
import { PublishResetPasswordEventsStep } from '@authentication/application/sagas/reset-password/steps/reset-password-publish-events.saga-step';
import { ValidateResetTokenStep } from '@authentication/application/sagas/reset-password/steps/reset-password-validate-token.saga-step';
import { ResetPasswordSagaContext } from '@authentication/application/sagas/reset-password/reset-password.saga-context';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { IPasswordResetTokenContract } from '@authentication/domain/contracts/password-reset-token.contract';
import { TokenExpiredException } from '@authentication/domain/exceptions/token-expired.exception';
import { PasswordResetTokenModel } from '@authentication/domain/models/password-reset-token.model';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { InvalidPasswordException } from '@authentication/domain/exceptions/invalid-password.exception';
import * as PasswordVOModule from '@authentication/domain/value-objects/password.vo';

const VALID_RESET_TOKEN_HASH_UUID = '550e8400-e29b-41d4-a716-446655440000';

function buildValidResetToken(): PasswordResetTokenModel {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);
  return PasswordResetTokenModel.reconstitute({
    id: 1,
    uuid: VALID_RESET_TOKEN_HASH_UUID,
    userId: 1,
    tokenHash: 'stored-hash',
    expiresAt,
    usedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
  });
}

// ─── ArchiveUserSessionsStep ──────────────────────────────────────────────────
describe('ArchiveUserSessionsStep', () => {
  let step: ArchiveUserSessionsStep;
  let sessionContract: jest.Mocked<Pick<ISessionContract, 'archiveAllByUserId'>>;

  beforeEach(async () => {
    sessionContract = { archiveAllByUserId: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchiveUserSessionsStep,
        { provide: INJECTION_TOKENS.SESSION_CONTRACT, useValue: sessionContract },
      ],
    }).compile();

    step = module.get<ArchiveUserSessionsStep>(ArchiveUserSessionsStep);
  });

  describe('Given a context with resetToken set', () => {
    describe('When execute() is called', () => {
      it('Then it archives all sessions for the user', async () => {
        const ctx: ResetPasswordSagaContext = {
          token: 'tok',
          newPassword: 'NewPass1',
          resetToken: buildValidResetToken(),
        };
        await step.execute(ctx);
        expect(sessionContract.archiveAllByUserId).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Given a context without resetToken', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: ResetPasswordSagaContext = { token: 'tok', newPassword: 'NewPass1' };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.resetToken not set');
      });
    });
  });
});

// ─── HashNewPasswordStep ──────────────────────────────────────────────────────
describe('HashNewPasswordStep', () => {
  let step: HashNewPasswordStep;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashNewPasswordStep],
    }).compile();

    step = module.get<HashNewPasswordStep>(HashNewPasswordStep);
  });

  describe('Given a new password in the context', () => {
    describe('When execute() is called', () => {
      it('Then it hashes the password and sets ctx.newPasswordHash', async () => {
        const ctx: ResetPasswordSagaContext = {
          token: 'tok',
          newPassword: 'NewSecurePass1',
        };
        await step.execute(ctx);
        expect(ctx.newPasswordHash).toBeDefined();
        expect(typeof ctx.newPasswordHash).toBe('string');
        expect(ctx.newPasswordHash!.length).toBeGreaterThan(0);
      });
    });
  });
});

// ─── MarkTokenUsedStep ────────────────────────────────────────────────────────
describe('MarkTokenUsedStep', () => {
  let step: MarkTokenUsedStep;
  let passwordResetTokenContract: jest.Mocked<Pick<IPasswordResetTokenContract, 'persist'>>;

  beforeEach(async () => {
    passwordResetTokenContract = {
      persist: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkTokenUsedStep,
        {
          provide: INJECTION_TOKENS.PASSWORD_RESET_TOKEN_CONTRACT,
          useValue: passwordResetTokenContract,
        },
      ],
    }).compile();

    step = module.get<MarkTokenUsedStep>(MarkTokenUsedStep);
  });

  describe('Given a context with resetToken set', () => {
    describe('When execute() is called', () => {
      it('Then it marks the token as used and persists it', async () => {
        const resetToken = buildValidResetToken();
        const ctx: ResetPasswordSagaContext = {
          token: 'tok',
          newPassword: 'NewPass1',
          resetToken,
        };
        await step.execute(ctx);
        expect(resetToken.isUsed()).toBe(true);
        expect(passwordResetTokenContract.persist).toHaveBeenCalledWith(resetToken);
      });
    });
  });

  describe('Given a context without resetToken', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', async () => {
        const ctx: ResetPasswordSagaContext = { token: 'tok', newPassword: 'NewPass1' };
        await expect(step.execute(ctx)).rejects.toThrow('ctx.resetToken not set');
      });
    });
  });
});

// ─── PublishResetPasswordEventsStep ──────────────────────────────────────────
describe('PublishResetPasswordEventsStep', () => {
  let step: PublishResetPasswordEventsStep;
  let eventBus: { publish: jest.Mock };
  let eventPublisher: { mergeObjectContext: jest.Mock };

  beforeEach(async () => {
    eventBus = { publish: jest.fn() };
    eventPublisher = { mergeObjectContext: jest.fn().mockImplementation((obj) => obj) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishResetPasswordEventsStep,
        { provide: EventBus, useValue: eventBus },
        { provide: EventPublisher, useValue: eventPublisher },
      ],
    }).compile();

    step = module.get<PublishResetPasswordEventsStep>(PublishResetPasswordEventsStep);
  });

  describe('Given a context with resetToken and newPasswordHash', () => {
    describe('When execute() is called', () => {
      it('Then it publishes the cross-BC integration event', async () => {
        const resetToken = buildValidResetToken();
        const ctx: ResetPasswordSagaContext = {
          token: 'tok',
          newPassword: 'NewPass1',
          resetToken,
          newPasswordHash: 'hashed-password',
        };
        await step.execute(ctx);
        expect(eventBus.publish).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given a context without resetToken', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', () => {
        const ctx: ResetPasswordSagaContext = {
          token: 'tok',
          newPassword: 'p',
          newPasswordHash: 'hash',
        };
        expect(() => step.execute(ctx)).toThrow('ctx.resetToken not set');
      });
    });
  });

  describe('Given a context without newPasswordHash', () => {
    describe('When execute() is called', () => {
      it('Then it throws an invariant violation error', () => {
        const ctx: ResetPasswordSagaContext = {
          token: 'tok',
          newPassword: 'NewPass1',
          resetToken: buildValidResetToken(),
        };
        expect(() => step.execute(ctx)).toThrow('ctx.newPasswordHash not set');
      });
    });
  });
});

// ─── ValidateResetTokenStep ───────────────────────────────────────────────────
describe('ValidateResetTokenStep', () => {
  let step: ValidateResetTokenStep;
  let passwordResetTokenContract: jest.Mocked<Pick<IPasswordResetTokenContract, 'findByTokenHash'>>;

  beforeEach(async () => {
    passwordResetTokenContract = { findByTokenHash: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateResetTokenStep,
        {
          provide: INJECTION_TOKENS.PASSWORD_RESET_TOKEN_CONTRACT,
          useValue: passwordResetTokenContract,
        },
      ],
    }).compile();

    step = module.get<ValidateResetTokenStep>(ValidateResetTokenStep);
  });

  describe('Given a valid token with a strong new password', () => {
    beforeEach(() => {
      passwordResetTokenContract.findByTokenHash.mockResolvedValue(buildValidResetToken());
    });

    describe('When execute() is called', () => {
      it('Then it sets resetToken on the context', async () => {
        const ctx: ResetPasswordSagaContext = {
          token: 'valid-raw-token',
          newPassword: 'StrongPass1',
        };
        await step.execute(ctx);
        expect(ctx.resetToken).toBeDefined();
        expect(ctx.resetToken!.userId).toBe(1);
      });
    });
  });

  describe('Given a token that does not exist', () => {
    beforeEach(() => {
      passwordResetTokenContract.findByTokenHash.mockResolvedValue(null);
    });

    describe('When execute() is called', () => {
      it('Then it throws TokenExpiredException', async () => {
        const ctx: ResetPasswordSagaContext = { token: 'bad-token', newPassword: 'StrongPass1' };
        await expect(step.execute(ctx)).rejects.toThrow(TokenExpiredException);
      });
    });
  });

  describe('Given a valid token but a weak new password', () => {
    beforeEach(() => {
      passwordResetTokenContract.findByTokenHash.mockResolvedValue(buildValidResetToken());
    });

    describe('When execute() is called with an invalid password', () => {
      it('Then it throws InvalidPasswordException', async () => {
        const ctx: ResetPasswordSagaContext = {
          token: 'valid-raw-token',
          newPassword: 'weak',
        };
        await expect(step.execute(ctx)).rejects.toThrow(InvalidPasswordException);
      });
    });
  });

  describe('Given PasswordVO throws a non-DomainException error during validation', () => {
    beforeEach(() => {
      passwordResetTokenContract.findByTokenHash.mockResolvedValue(buildValidResetToken());
    });

    describe('When execute() is called', () => {
      it('Then it re-throws the non-domain error', async () => {
        const spy = jest.spyOn(PasswordVOModule, 'PasswordVO').mockImplementationOnce(() => {
          throw new Error('non-domain PasswordVO error');
        });

        const ctx: ResetPasswordSagaContext = {
          token: 'valid-raw-token',
          newPassword: 'any-password',
        };
        await expect(step.execute(ctx)).rejects.toThrow('non-domain PasswordVO error');

        spy.mockRestore();
      });
    });
  });
});
