import { SaveOnboardingStepCommand } from '@onboarding/application/commands/save-onboarding-step/save-onboarding-step.command';
import { SaveOnboardingStepHandler } from '@onboarding/application/commands/save-onboarding-step/save-onboarding-step.handler';
import { StartOnboardingCommand } from '@onboarding/application/commands/start-onboarding/start-onboarding.command';
import { StartOnboardingHandler } from '@onboarding/application/commands/start-onboarding/start-onboarding.handler';
import type { IOnboardingSessionContract } from '@onboarding/domain/contracts/onboarding-session.contract';
import { OnboardingAlreadyCompletedError } from '@onboarding/domain/errors/onboarding-already-completed.error';
import { OnboardingNotFoundError } from '@onboarding/domain/errors/onboarding-not-found.error';
import { OnboardingSessionModel } from '@onboarding/domain/models/onboarding-session.model';

const USER_UUID = '019538a0-0000-7000-8000-000000000001';

function makeContractStub(): jest.Mocked<IOnboardingSessionContract> {
  return {
    findByUserUUID: jest.fn(),
    save: jest.fn().mockImplementation(async (s: OnboardingSessionModel) => s),
    delete: jest.fn(),
  } as unknown as jest.Mocked<IOnboardingSessionContract>;
}

// ─── StartOnboardingHandler ───────────────────────────────────────────────────

describe('StartOnboardingHandler', () => {
  let contract: jest.Mocked<IOnboardingSessionContract>;
  let handler: StartOnboardingHandler;

  beforeEach(() => {
    contract = makeContractStub();
    handler = new StartOnboardingHandler(contract);
  });

  describe('Given a user without an existing onboarding session', () => {
    describe('When execute is called', () => {
      it('Then it creates a new session and persists it', async () => {
        contract.findByUserUUID.mockResolvedValue(null);

        const result = await handler.execute(new StartOnboardingCommand(USER_UUID));

        expect(result.isOk()).toBe(true);
        expect(contract.save).toHaveBeenCalled();
      });
    });
  });

  describe('Given a user with an in-progress session', () => {
    describe('When execute is called', () => {
      it('Then it returns the existing session without persisting again', async () => {
        const existing = OnboardingSessionModel.create({ userUUID: USER_UUID });
        contract.findByUserUUID.mockResolvedValue(existing);

        const result = await handler.execute(new StartOnboardingCommand(USER_UUID));

        expect(result.isOk()).toBe(true);
        expect(contract.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a user with a completed session', () => {
    describe('When execute is called', () => {
      it('Then it returns OnboardingAlreadyCompletedError', async () => {
        const existing = OnboardingSessionModel.create({ userUUID: USER_UUID });
        existing.markCompleted();
        contract.findByUserUUID.mockResolvedValue(existing);

        const result = await handler.execute(new StartOnboardingCommand(USER_UUID));

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(OnboardingAlreadyCompletedError);
      });
    });
  });
});

// ─── SaveOnboardingStepHandler ────────────────────────────────────────────────

describe('SaveOnboardingStepHandler', () => {
  let contract: jest.Mocked<IOnboardingSessionContract>;
  let handler: SaveOnboardingStepHandler;

  beforeEach(() => {
    contract = makeContractStub();
    handler = new SaveOnboardingStepHandler(contract);
  });

  describe('Given an active onboarding session', () => {
    describe('When execute is called with new step data', () => {
      it('Then it persists the saved progress', async () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        contract.findByUserUUID.mockResolvedValue(session);

        const result = await handler.execute(
          new SaveOnboardingStepCommand(USER_UUID, 'organization', { name: 'Mi Negocio' }, 2),
        );

        expect(result.isOk()).toBe(true);
        expect(contract.save).toHaveBeenCalled();
      });
    });
  });

  describe('Given no active session exists for the user', () => {
    describe('When execute is called', () => {
      it('Then it returns OnboardingNotFoundError', async () => {
        contract.findByUserUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new SaveOnboardingStepCommand(USER_UUID, 'organization', {}, 1),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(OnboardingNotFoundError);
      });
    });
  });

  describe('Given a completed session', () => {
    describe('When execute is called', () => {
      it('Then it returns OnboardingAlreadyCompletedError', async () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.markCompleted();
        contract.findByUserUUID.mockResolvedValue(session);

        const result = await handler.execute(
          new SaveOnboardingStepCommand(USER_UUID, 'organization', {}, 1),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(OnboardingAlreadyCompletedError);
      });
    });
  });
});
