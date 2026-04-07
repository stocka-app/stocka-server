/**
 * Unit tests for reset-password saga steps covering guard branches.
 */
import { EventBus, EventPublisher } from '@nestjs/cqrs';

import { ArchiveUserSessionsStep } from '@authentication/application/sagas/reset-password/steps/reset-password-archive-sessions.saga-step';
import { MarkTokenUsedStep } from '@authentication/application/sagas/reset-password/steps/reset-password-mark-token-used.saga-step';
import { PublishResetPasswordEventsStep } from '@authentication/application/sagas/reset-password/steps/reset-password-publish-events.saga-step';
import { ValidateResetTokenStep } from '@authentication/application/sagas/reset-password/steps/reset-password-validate-token.saga-step';

import { ResetPasswordSagaContext } from '@authentication/application/sagas/reset-password/reset-password.saga-context';
import { ISessionContract } from '@user/account/session/domain/session.contract';
import { IPasswordResetTokenContract } from '@authentication/domain/contracts/password-reset-token.contract';
import { PasswordResetTokenModel } from '@authentication/domain/models/password-reset-token.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseCtx(overrides: Partial<ResetPasswordSagaContext> = {}): ResetPasswordSagaContext {
  return {
    token: 'reset-token',
    newPassword: 'NewPass1!',
    ...overrides,
  } as ResetPasswordSagaContext;
}

function buildSessionContract(): jest.Mocked<ISessionContract> {
  return {
    persist: jest.fn(),
    persistWithCredential: jest.fn(),
    persistWithSocial: jest.fn(),
    findByTokenHash: jest.fn(),
    archive: jest.fn(),
    archiveAllByAccountId: jest.fn(),
  } as unknown as jest.Mocked<ISessionContract>;
}

function buildPrtContract(): jest.Mocked<IPasswordResetTokenContract> {
  return {
    persist: jest.fn(),
    findByTokenHash: jest.fn(),
    invalidateForCredential: jest.fn(),
  } as unknown as jest.Mocked<IPasswordResetTokenContract>;
}

function buildResetToken(
  overrides: {
    isValid?: boolean;
  } = {},
): PasswordResetTokenModel {
  return {
    id: 1,
    credentialAccountId: 10,
    isValid: jest.fn().mockReturnValue(overrides.isValid ?? true),
    markAsUsed: jest.fn(),
    commit: jest.fn(),
  } as unknown as PasswordResetTokenModel;
}

// ─── ArchiveUserSessionsStep ─────────────────────────────────────────────────

describe('ArchiveUserSessionsStep', () => {
  let step: ArchiveUserSessionsStep;
  let sessionContract: jest.Mocked<ISessionContract>;

  beforeEach(() => {
    sessionContract = buildSessionContract();
    step = new ArchiveUserSessionsStep(sessionContract);
  });

  describe('Given the ctx is missing resetToken', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing resetToken', async () => {
        await expect(step.execute(baseCtx({ resetToken: undefined }))).rejects.toThrow(
          'ctx.resetToken not set',
        );
      });
    });
  });
});

// ─── MarkTokenUsedStep ───────────────────────────────────────────────────────

describe('MarkTokenUsedStep', () => {
  let step: MarkTokenUsedStep;
  let prtContract: jest.Mocked<IPasswordResetTokenContract>;

  beforeEach(() => {
    prtContract = buildPrtContract();
    step = new MarkTokenUsedStep(prtContract);
  });

  describe('Given the ctx is missing resetToken', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing resetToken', async () => {
        await expect(step.execute(baseCtx({ resetToken: undefined }))).rejects.toThrow(
          'ctx.resetToken not set',
        );
      });
    });
  });
});

// ─── PublishResetPasswordEventsStep ─────────────────────────────────────────

describe('PublishResetPasswordEventsStep', () => {
  let step: PublishResetPasswordEventsStep;
  let eventBus: jest.Mocked<EventBus>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(() => {
    eventBus = { publish: jest.fn() } as unknown as jest.Mocked<EventBus>;
    eventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj: unknown) => obj),
    } as unknown as jest.Mocked<EventPublisher>;

    step = new PublishResetPasswordEventsStep(eventBus, eventPublisher);
  });

  describe('Given the ctx is missing resetToken', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing resetToken', () => {
        expect(() => step.execute(baseCtx({ resetToken: undefined }))).toThrow(
          'ctx.resetToken not set',
        );
      });
    });
  });

  describe('Given the ctx is missing newPasswordHash', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing newPasswordHash', () => {
        expect(() =>
          step.execute(baseCtx({ resetToken: buildResetToken(), newPasswordHash: undefined })),
        ).toThrow('ctx.newPasswordHash not set');
      });
    });
  });
});

// ─── ValidateResetTokenStep ──────────────────────────────────────────────────

describe('ValidateResetTokenStep', () => {
  let step: ValidateResetTokenStep;
  let prtContract: jest.Mocked<IPasswordResetTokenContract>;

  beforeEach(() => {
    prtContract = buildPrtContract();
    step = new ValidateResetTokenStep(prtContract);
  });

  describe('Given no reset token is found', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        prtContract.findByTokenHash.mockResolvedValue(null);
      });

      it('Then it throws TokenExpiredException', async () => {
        const { TokenExpiredException } =
          await import('@authentication/domain/exceptions/token-expired.exception');
        await expect(step.execute(baseCtx())).rejects.toBeInstanceOf(TokenExpiredException);
      });
    });
  });

  describe('Given the reset token is found but invalid', () => {
    describe('When execute is called', () => {
      beforeEach(() => {
        prtContract.findByTokenHash.mockResolvedValue(buildResetToken({ isValid: false }));
      });

      it('Then it throws TokenExpiredException', async () => {
        const { TokenExpiredException } =
          await import('@authentication/domain/exceptions/token-expired.exception');
        await expect(step.execute(baseCtx())).rejects.toBeInstanceOf(TokenExpiredException);
      });
    });
  });
});
