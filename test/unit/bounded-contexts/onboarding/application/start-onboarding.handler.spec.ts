import { StartOnboardingHandler } from '@onboarding/application/commands/start-onboarding/start-onboarding.handler';
import { StartOnboardingCommand } from '@onboarding/application/commands/start-onboarding/start-onboarding.command';
import { IOnboardingSessionContract } from '@onboarding/domain/contracts/onboarding-session.contract';
import { OnboardingSessionModel } from '@onboarding/domain/models/onboarding-session.model';
import { OnboardingStatus } from '@onboarding/domain/enums/onboarding-status.enum';
import { OnboardingAlreadyCompletedError } from '@onboarding/domain/errors/onboarding-already-completed.error';

describe('StartOnboardingHandler', () => {
  let handler: StartOnboardingHandler;
  let sessionContract: jest.Mocked<IOnboardingSessionContract>;

  const USER_UUID = '019538a0-0000-7000-8000-000000000001';

  beforeEach(() => {
    sessionContract = {
      findByUserUUID: jest.fn(),
      save: jest.fn(),
    };
    handler = new StartOnboardingHandler(sessionContract);
  });

  describe('Given a user with no existing onboarding session', () => {
    describe('When the command is executed', () => {
      it('Then it creates a new IN_PROGRESS session and returns it', async () => {
        sessionContract.findByUserUUID.mockResolvedValue(null);
        const created = OnboardingSessionModel.create({ userUUID: USER_UUID });
        sessionContract.save.mockResolvedValue(created);

        const result = await handler.execute(new StartOnboardingCommand(USER_UUID));

        expect(result.isOk()).toBe(true);
        result.map((session) => {
          expect(session.status).toBe(OnboardingStatus.IN_PROGRESS);
          expect(session.userUUID).toBe(USER_UUID);
        });
        expect(sessionContract.save).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given a user with an existing IN_PROGRESS session', () => {
    describe('When the command is executed again', () => {
      it('Then it returns the existing session without creating a new one (idempotent)', async () => {
        const existing = OnboardingSessionModel.create({ userUUID: USER_UUID });
        sessionContract.findByUserUUID.mockResolvedValue(existing);

        const result = await handler.execute(new StartOnboardingCommand(USER_UUID));

        expect(result.isOk()).toBe(true);
        result.map((session) => {
          expect(session.status).toBe(OnboardingStatus.IN_PROGRESS);
        });
        expect(sessionContract.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a user whose onboarding is already COMPLETED', () => {
    describe('When the command is executed', () => {
      it('Then it returns an OnboardingAlreadyCompletedError', async () => {
        const completed = OnboardingSessionModel.create({ userUUID: USER_UUID });
        completed.markCompleted();
        sessionContract.findByUserUUID.mockResolvedValue(completed);

        const result = await handler.execute(new StartOnboardingCommand(USER_UUID));

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(OnboardingAlreadyCompletedError));
      });
    });
  });
});
