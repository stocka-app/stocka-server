import { SaveOnboardingStepHandler } from '@onboarding/application/commands/save-onboarding-step/save-onboarding-step.handler';
import { SaveOnboardingStepCommand } from '@onboarding/application/commands/save-onboarding-step/save-onboarding-step.command';
import { IOnboardingSessionContract } from '@onboarding/domain/contracts/onboarding-session.contract';
import { OnboardingSessionModel } from '@onboarding/domain/models/onboarding-session.model';
import { OnboardingPath } from '@onboarding/domain/enums/onboarding-path.enum';
import { OnboardingAlreadyCompletedError } from '@onboarding/domain/errors/onboarding-already-completed.error';
import { OnboardingNotFoundError } from '@onboarding/domain/errors/onboarding-not-found.error';

describe('SaveOnboardingStepHandler', () => {
  let handler: SaveOnboardingStepHandler;
  let sessionContract: jest.Mocked<IOnboardingSessionContract>;

  const USER_UUID = '019538a0-0000-7000-8000-000000000001';

  beforeEach(() => {
    sessionContract = {
      findByUserUUID: jest.fn(),
      save: jest.fn(),
    };
    handler = new SaveOnboardingStepHandler(sessionContract);
  });

  describe('Given a user with no onboarding session', () => {
    describe('When step data is submitted', () => {
      it('Then it returns an OnboardingNotFoundError', async () => {
        sessionContract.findByUserUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new SaveOnboardingStepCommand(USER_UUID, 1, { acceptedTyC: true }),
        );

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(OnboardingNotFoundError));
      });
    });
  });

  describe('Given a user whose onboarding is already COMPLETED', () => {
    describe('When step data is submitted', () => {
      it('Then it returns an OnboardingAlreadyCompletedError', async () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.markCompleted();
        sessionContract.findByUserUUID.mockResolvedValue(session);

        const result = await handler.execute(
          new SaveOnboardingStepCommand(USER_UUID, 3, { name: 'My Shop' }),
        );

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(OnboardingAlreadyCompletedError));
      });
    });
  });

  describe('Given a user with an IN_PROGRESS session saving step 0 with CREATE path', () => {
    describe('When step 0 data with path=CREATE is submitted', () => {
      it('Then it saves the path and returns the updated session', async () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        sessionContract.findByUserUUID.mockResolvedValue(session);
        sessionContract.save.mockImplementation((s) => Promise.resolve(s));

        const result = await handler.execute(
          new SaveOnboardingStepCommand(USER_UUID, 0, { path: 'CREATE' }),
        );

        expect(result.isOk()).toBe(true);
        result.map((s) => {
          expect(s.path).toBe(OnboardingPath.CREATE);
          expect(s.currentStep).toBe(0);
        });
      });
    });
  });

  describe('Given a user with an IN_PROGRESS session saving step 0 with JOIN path', () => {
    describe('When step 0 data with path=JOIN and an invitation code is submitted', () => {
      it('Then it saves the path and invitation code', async () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        sessionContract.findByUserUUID.mockResolvedValue(session);
        sessionContract.save.mockImplementation((s) => Promise.resolve(s));

        const result = await handler.execute(
          new SaveOnboardingStepCommand(USER_UUID, 0, { path: 'JOIN', invitationCode: 'abc123' }),
        );

        expect(result.isOk()).toBe(true);
        result.map((s) => {
          expect(s.path).toBe(OnboardingPath.JOIN);
          expect(s.invitationCode).toBe('abc123');
        });
      });
    });
  });

  describe('Given a user advancing to a later step', () => {
    describe('When step 3 data is submitted after step 0', () => {
      it('Then currentStep advances to 3', async () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.saveStep(0, { path: 'CREATE' });
        sessionContract.findByUserUUID.mockResolvedValue(session);
        sessionContract.save.mockImplementation((s) => Promise.resolve(s));

        const result = await handler.execute(
          new SaveOnboardingStepCommand(USER_UUID, 3, {
            name: 'Mi Tienda',
            businessType: 'retail',
            country: 'MX',
            timezone: 'America/Mexico_City',
          }),
        );

        expect(result.isOk()).toBe(true);
        result.map((s) => expect(s.currentStep).toBe(3));
      });
    });
  });
});
