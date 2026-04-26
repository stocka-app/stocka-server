/**
 * Unit tests for sign-up saga steps covering the guard branches (missing ctx fields)
 * and the compensate() method on steps that have one.
 */
import { EventBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { RegisterUserStep } from '@authentication/application/sagas/sign-up/steps/sign-up-register-user.saga-step';
import { GenerateTokensStep } from '@authentication/application/sagas/sign-up/steps/sign-up-generate-tokens.saga-step';
import { CreateSessionStep } from '@authentication/application/sagas/sign-up/steps/sign-up-create-session.saga-step';
import { CreateVerificationTokenStep } from '@authentication/application/sagas/sign-up/steps/sign-up-create-verification-token.saga-step';
import { PublishSignUpEventsStep } from '@authentication/application/sagas/sign-up/steps/sign-up-publish-events.saga-step';
import { SendVerificationEmailStep } from '@authentication/application/sagas/sign-up/steps/sign-up-send-verification-email.saga-step';

import { SignUpSagaContext } from '@authentication/application/sagas/sign-up/sign-up.saga-context';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { ISessionContract } from '@user/account/session/domain/session.contract';
import { IEmailVerificationTokenContract } from '@authentication/domain/contracts/email-verification-token.contract';
import { ICodeGeneratorContract } from '@shared/domain/contracts/code-generator.contract';
import { IEmailProviderContract } from '@shared/infrastructure/email/contracts/email-provider.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserAggregate } from '@user/domain/aggregates/user.aggregate';
import { CredentialAccountModel } from '@user/account/domain/models/credential-account.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseCtx(overrides: Partial<SignUpSagaContext> = {}): SignUpSagaContext {
  return {
    email: 'test@example.com',
    username: 'testuser',
    lang: 'en',
    ...overrides,
  } as SignUpSagaContext;
}

function buildUser(): UserAggregate {
  return { uuid: 'user-uuid', id: 42 } as unknown as UserAggregate;
}

function buildCredential(): CredentialAccountModel {
  return {
    id: 10,
    accountId: 5,
    email: 'test@example.com',
  } as unknown as CredentialAccountModel;
}

// ─── RegisterUserStep ────────────────────────────────────────────────────────

describe('RegisterUserStep', () => {
  let step: RegisterUserStep;
  let mediator: jest.Mocked<MediatorService>;

  beforeEach(() => {
    mediator = {
      user: { createUserWithCredentials: jest.fn() },
    } as unknown as jest.Mocked<MediatorService>;

    step = new RegisterUserStep(mediator);
  });

  describe('Given the ctx is missing passwordHash', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing passwordHash', async () => {
        await expect(step.execute(baseCtx({ passwordHash: undefined }))).rejects.toThrow(
          'ctx.passwordHash not set',
        );
      });
    });
  });

  describe('Given compensate is called', () => {
    describe('When it is called with any context', () => {
      it('Then it resolves without doing anything', async () => {
        await expect(step.compensate(baseCtx())).resolves.toBeUndefined();
      });
    });
  });
});

// ─── GenerateTokensStep ──────────────────────────────────────────────────────

describe('GenerateTokensStep', () => {
  let step: GenerateTokensStep;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    jwtService = { signAsync: jest.fn() } as unknown as jest.Mocked<JwtService>;
    configService = {
      get: jest.fn().mockReturnValue('15m'),
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    } as unknown as jest.Mocked<ConfigService>;

    step = new GenerateTokensStep(jwtService, configService);
  });

  describe('Given the ctx is missing user', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing user', async () => {
        await expect(step.execute(baseCtx({ user: undefined }))).rejects.toThrow(
          'ctx.user not set',
        );
      });
    });
  });

  describe('Given the ctx is missing credential', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing credential', async () => {
        await expect(
          step.execute(baseCtx({ user: buildUser(), credential: undefined })),
        ).rejects.toThrow('ctx.credential not set');
      });
    });
  });
});

// ─── CreateSessionStep ───────────────────────────────────────────────────────

describe('CreateSessionStep (sign-up)', () => {
  let step: CreateSessionStep;
  let sessionContract: jest.Mocked<ISessionContract>;

  beforeEach(() => {
    sessionContract = {
      persist: jest.fn(),
      persistWithCredential: jest.fn(),
      persistWithSocial: jest.fn(),
      findByTokenHash: jest.fn(),
      archive: jest.fn(),
      archiveAllByAccountId: jest.fn(),
    } as unknown as jest.Mocked<ISessionContract>;

    step = new CreateSessionStep(sessionContract);
  });

  describe('Given the ctx is missing user', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing user', async () => {
        await expect(step.execute(baseCtx({ user: undefined }))).rejects.toThrow(
          'ctx.user not set',
        );
      });
    });
  });

  describe('Given the ctx is missing credential', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing credential', async () => {
        await expect(
          step.execute(baseCtx({ user: buildUser(), credential: undefined })),
        ).rejects.toThrow('ctx.credential not set');
      });
    });
  });

  describe('Given the ctx is missing refreshToken', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing refreshToken', async () => {
        await expect(
          step.execute(
            baseCtx({ user: buildUser(), credential: buildCredential(), refreshToken: undefined }),
          ),
        ).rejects.toThrow('ctx.refreshToken not set');
      });
    });
  });
});

// ─── CreateVerificationTokenStep ─────────────────────────────────────────────

describe('CreateVerificationTokenStep', () => {
  let step: CreateVerificationTokenStep;
  let codeGenerator: jest.Mocked<ICodeGeneratorContract>;
  let tokenContract: jest.Mocked<IEmailVerificationTokenContract>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    codeGenerator = {
      generateVerificationCode: jest.fn().mockReturnValue('ABC123'),
      generateSecureToken: jest.fn().mockReturnValue('a'.repeat(64)),
      hashCode: jest.fn().mockReturnValue('hashed-code'),
    };

    tokenContract = {
      persist: jest.fn(),
      findActiveByCredentialAccountId: jest.fn(),
      invalidateAllForCredential: jest.fn(),
    } as unknown as jest.Mocked<IEmailVerificationTokenContract>;

    configService = {
      get: jest.fn().mockReturnValue(10),
    } as unknown as jest.Mocked<ConfigService>;

    step = new CreateVerificationTokenStep(codeGenerator, tokenContract, configService);
  });

  describe('Given the ctx is missing credential', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing credential', async () => {
        await expect(
          step.execute(baseCtx({ credential: undefined, verificationCode: 'ABC123' })),
        ).rejects.toThrow('ctx.credential not set');
      });
    });
  });

  describe('Given the ctx is missing verificationCode', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing verificationCode', async () => {
        await expect(
          step.execute(baseCtx({ credential: buildCredential(), verificationCode: undefined })),
        ).rejects.toThrow('ctx.verificationCode not set');
      });
    });
  });
});

// ─── PublishSignUpEventsStep ─────────────────────────────────────────────────

describe('PublishSignUpEventsStep', () => {
  let step: PublishSignUpEventsStep;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    eventBus = { publish: jest.fn() } as unknown as jest.Mocked<EventBus>;
    step = new PublishSignUpEventsStep(eventBus);
  });

  describe('Given the ctx is missing user', () => {
    describe('When execute is called', () => {
      it('Then it rejects with an error about missing user', async () => {
        await expect(step.execute(baseCtx({ user: undefined }))).rejects.toThrow(
          'ctx.user not set',
        );
      });
    });
  });

  describe('Given the ctx is missing credential', () => {
    describe('When execute is called', () => {
      it('Then it rejects with an error about missing credential', async () => {
        await expect(
          step.execute(baseCtx({ user: buildUser(), credential: undefined })),
        ).rejects.toThrow('ctx.credential not set');
      });
    });
  });
});

// ─── SendVerificationEmailStep ───────────────────────────────────────────────

describe('SendVerificationEmailStep', () => {
  let step: SendVerificationEmailStep;
  let emailProvider: jest.Mocked<IEmailProviderContract>;

  beforeEach(() => {
    emailProvider = {
      sendEmail: jest.fn(),
      sendVerificationEmail: jest.fn().mockResolvedValue({ id: 'email-id', success: true }),
      sendWelcomeEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };

    step = new SendVerificationEmailStep(emailProvider);
  });

  describe('Given the ctx is missing user', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing user', async () => {
        await expect(step.execute(baseCtx({ user: undefined }))).rejects.toThrow(
          'ctx.user not set',
        );
      });
    });
  });

  describe('Given the ctx is missing credential', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing credential', async () => {
        await expect(
          step.execute(baseCtx({ user: buildUser(), credential: undefined })),
        ).rejects.toThrow('ctx.credential not set');
      });
    });
  });

  describe('Given the ctx is missing verificationCode', () => {
    describe('When execute is called', () => {
      it('Then it throws an error about missing verificationCode', async () => {
        await expect(
          step.execute(
            baseCtx({
              user: buildUser(),
              credential: buildCredential(),
              verificationCode: undefined,
            }),
          ),
        ).rejects.toThrow('ctx.verificationCode not set');
      });
    });
  });
});
