import { GetOnboardingStatusHandler } from '@onboarding/application/queries/get-onboarding-status/get-onboarding-status.handler';
import { GetOnboardingStatusQuery } from '@onboarding/application/queries/get-onboarding-status/get-onboarding-status.query';
import { IOnboardingSessionContract } from '@onboarding/domain/contracts/onboarding-session.contract';
import { OnboardingSessionModel } from '@onboarding/domain/models/onboarding-session.model';
import { OnboardingStatus } from '@onboarding/domain/enums/onboarding-status.enum';

describe('GetOnboardingStatusHandler', () => {
  let handler: GetOnboardingStatusHandler;
  let sessionContract: jest.Mocked<IOnboardingSessionContract>;

  const USER_UUID = '019538a0-0000-7000-8000-000000000001';

  beforeEach(() => {
    sessionContract = {
      findByUserUUID: jest.fn(),
      save: jest.fn(),
    };
    handler = new GetOnboardingStatusHandler(sessionContract);
  });

  describe('Given a user with no onboarding session', () => {
    describe('When the status is queried', () => {
      it('Then it returns null', async () => {
        sessionContract.findByUserUUID.mockResolvedValue(null);

        const result = await handler.execute(new GetOnboardingStatusQuery(USER_UUID));

        expect(result).toBeNull();
      });
    });
  });

  describe('Given a user with an IN_PROGRESS session at step 2', () => {
    describe('When the status is queried', () => {
      it('Then it returns the session with correct status and currentStep', async () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.saveProgress('path', { path: 'CREATE' }, 0);
        session.saveProgress('consents', { acceptedTyC: true }, 1);
        session.saveProgress('preferences', { language: 'es', currency: 'MXN' }, 2);
        sessionContract.findByUserUUID.mockResolvedValue(session);

        const result = await handler.execute(new GetOnboardingStatusQuery(USER_UUID));

        expect(result).not.toBeNull();
        expect(result!.status).toBe(OnboardingStatus.IN_PROGRESS);
        expect(result!.currentStep).toBe(2);
      });
    });
  });

  describe('Given a user whose onboarding is COMPLETED', () => {
    describe('When the status is queried', () => {
      it('Then it returns the session with COMPLETED status', async () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.markCompleted();
        sessionContract.findByUserUUID.mockResolvedValue(session);

        const result = await handler.execute(new GetOnboardingStatusQuery(USER_UUID));

        expect(result!.status).toBe(OnboardingStatus.COMPLETED);
      });
    });
  });
});
