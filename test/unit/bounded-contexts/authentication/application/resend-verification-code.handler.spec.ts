import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ResendVerificationCodeHandler } from '@authentication/application/commands/resend-verification-code/resend-verification-code.handler';
import { ResendVerificationCodeCommand } from '@authentication/application/commands/resend-verification-code/resend-verification-code.command';
import { IEmailVerificationTokenContract } from '@authentication/domain/contracts/email-verification-token.contract';
import { ICodeGeneratorContract } from '@shared/domain/contracts/code-generator.contract';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { ResendCooldownActiveException } from '@authentication/domain/exceptions/resend-cooldown-active.exception';
import { MaxResendsExceededException } from '@authentication/domain/exceptions/max-resends-exceeded.exception';
import { UserAlreadyVerifiedException } from '@authentication/domain/exceptions/user-already-verified.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';
import { EmailVerificationTokenModel } from '@authentication/domain/models/email-verification-token.model';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const FUTURE_DATE = (): Date => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 10);
  return d;
};

describe('ResendVerificationCodeHandler', () => {
  let handler: ResendVerificationCodeHandler;
  let mediator: { user: { findByEmail: jest.Mock } };
  let tokenContract: jest.Mocked<Pick<IEmailVerificationTokenContract, 'findActiveByUserId' | 'persist'>>;
  let codeGenerator: jest.Mocked<Pick<ICodeGeneratorContract, 'generateVerificationCode' | 'hashCode'>>;
  let configService: { get: jest.Mock };
  let eventPublisher: { mergeObjectContext: jest.Mock };

  const EMAIL = 'user@test.com';
  const COMMAND = new ResendVerificationCodeCommand(EMAIL, '127.0.0.1', undefined, 'es');

  beforeEach(async () => {
    mediator = {
      user: {
        findByEmail: jest.fn(),
      },
    };

    tokenContract = {
      findActiveByUserId: jest.fn(),
      persist: jest.fn().mockResolvedValue(undefined),
    };

    codeGenerator = {
      generateVerificationCode: jest.fn().mockReturnValue('NEWCOD'),
      hashCode: jest.fn().mockReturnValue('new-hash'),
    };

    configService = {
      get: jest.fn().mockReturnValue(10),
    };

    eventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj) => obj),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResendVerificationCodeHandler,
        { provide: MediatorService, useValue: mediator },
        { provide: ConfigService, useValue: configService },
        { provide: EventPublisher, useValue: eventPublisher },
        { provide: INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT, useValue: tokenContract },
        { provide: INJECTION_TOKENS.CODE_GENERATOR_CONTRACT, useValue: codeGenerator },
      ],
    }).compile();

    handler = module.get<ResendVerificationCodeHandler>(ResendVerificationCodeHandler);
  });

  describe('Given the email does not match any user', () => {
    beforeEach(() => {
      mediator.user.findByEmail.mockResolvedValue(null);
    });

    describe('When the handler executes', () => {
      it('Then it returns ok with an anti-enumeration message', async () => {
        const result = await handler.execute(COMMAND);
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().success).toBe(true);
        expect(result._unsafeUnwrap().message).toContain('If your email exists');
      });
    });
  });

  describe('Given the user is already verified', () => {
    beforeEach(() => {
      const verifiedUser = UserMother.createVerified({ id: 1, email: EMAIL, username: 'tester' });
      mediator.user.findByEmail.mockResolvedValue(verifiedUser);
    });

    describe('When the handler executes', () => {
      it('Then it returns err with UserAlreadyVerifiedException', async () => {
        const result = await handler.execute(COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(UserAlreadyVerifiedException);
      });
    });
  });

  describe('Given a pending user with an existing token that can be resent', () => {
    beforeEach(() => {
      const pendingUser = UserMother.createPendingVerification({ id: 1, email: EMAIL, username: 'tester' });
      mediator.user.findByEmail.mockResolvedValue(pendingUser);

      const existingToken = EmailVerificationTokenModel.reconstitute({
        id: 1,
        uuid: VALID_UUID,
        userId: 1,
        codeHash: 'old-hash',
        expiresAt: FUTURE_DATE(),
        resendCount: 0,
        lastResentAt: null,
      });
      tokenContract.findActiveByUserId.mockResolvedValue(existingToken);
    });

    describe('When the handler executes', () => {
      it('Then it returns ok with remaining resends info', async () => {
        const result = await handler.execute(COMMAND);
        expect(result.isOk()).toBe(true);
        const data = result._unsafeUnwrap();
        expect(data.success).toBe(true);
        expect(data.remainingResends).toBeDefined();
      });

      it('Then it persists the updated token', async () => {
        await handler.execute(COMMAND);
        expect(tokenContract.persist).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given a pending user with a token that is in cooldown', () => {
    beforeEach(() => {
      const pendingUser = UserMother.createPendingVerification({ id: 1, email: EMAIL, username: 'tester' });
      mediator.user.findByEmail.mockResolvedValue(pendingUser);

      // Reconstitute a token with 1 resend and a very recent lastResentAt (cooldown = 60s)
      const tokenInCooldown = EmailVerificationTokenModel.reconstitute({
        id: 1,
        uuid: VALID_UUID,
        userId: 1,
        codeHash: 'hash',
        expiresAt: FUTURE_DATE(),
        resendCount: 1,
        lastResentAt: new Date(), // just reissued, cooldown active
      });
      tokenContract.findActiveByUserId.mockResolvedValue(tokenInCooldown);
    });

    describe('When the handler executes', () => {
      it('Then it returns err with ResendCooldownActiveException', async () => {
        const result = await handler.execute(COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(ResendCooldownActiveException);
      });
    });
  });

  describe('Given a pending user with a token that has exceeded max resends', () => {
    beforeEach(() => {
      const pendingUser = UserMother.createPendingVerification({ id: 1, email: EMAIL, username: 'tester' });
      mediator.user.findByEmail.mockResolvedValue(pendingUser);

      // resendCount = 5 = MAX — no cooldown period applies (index is clamped), but getRemainingResends = 0
      const maxResendsToken = EmailVerificationTokenModel.reconstitute({
        id: 1,
        uuid: VALID_UUID,
        userId: 1,
        codeHash: 'hash',
        expiresAt: FUTURE_DATE(),
        resendCount: 5,
        lastResentAt: new Date(Date.now() - 400 * 1000), // cooldown expired (> 5m)
      });
      tokenContract.findActiveByUserId.mockResolvedValue(maxResendsToken);
    });

    describe('When the handler executes', () => {
      it('Then it returns err with MaxResendsExceededException', async () => {
        const result = await handler.execute(COMMAND);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(MaxResendsExceededException);
      });
    });
  });

  describe('Given a pending user with a token where cooldown just expired but max resends not yet reached', () => {
    beforeEach(() => {
      const pendingUser = UserMother.createPendingVerification({ id: 1, email: EMAIL, username: 'tester' });
      mediator.user.findByEmail.mockResolvedValue(pendingUser);

      // Edge case: canResend() evaluated false (timing race) but secondsRemaining=0 and getRemainingResends()>0
      const edgeCaseToken = {
        canResend: jest.fn().mockReturnValue(false),
        getSecondsUntilCanResend: jest.fn().mockReturnValue(0),
        getRemainingResends: jest.fn().mockReturnValue(1),
        getCurrentCooldownSeconds: jest.fn().mockReturnValue(0),
        updateCode: jest.fn(),
        commit: jest.fn(),
      } as unknown as EmailVerificationTokenModel;
      tokenContract.findActiveByUserId.mockResolvedValue(edgeCaseToken);
    });

    describe('When the handler executes', () => {
      it('Then it falls through the block, updates the token, and returns ok', async () => {
        const result = await handler.execute(COMMAND);
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().success).toBe(true);
        expect(tokenContract.persist).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given a pending user with no existing token', () => {
    beforeEach(() => {
      const pendingUser = UserMother.createPendingVerification({ id: 1, email: EMAIL, username: 'tester' });
      mediator.user.findByEmail.mockResolvedValue(pendingUser);
      tokenContract.findActiveByUserId.mockResolvedValue(null);
    });

    describe('When the handler executes', () => {
      it('Then it creates a new token and returns ok', async () => {
        const result = await handler.execute(COMMAND);
        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().success).toBe(true);
      });

      it('Then it persists the newly created token', async () => {
        await handler.execute(COMMAND);
        expect(tokenContract.persist).toHaveBeenCalledTimes(1);
      });
    });
  });
});
