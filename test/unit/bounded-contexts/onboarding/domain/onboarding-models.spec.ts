import { OnboardingSessionModel } from '@onboarding/domain/models/onboarding-session.model';
import { TenantInvitationModel } from '@onboarding/domain/models/tenant-invitation.model';
import { OnboardingPath } from '@onboarding/domain/enums/onboarding-path.enum';
import { OnboardingStatus } from '@onboarding/domain/enums/onboarding-status.enum';

describe('OnboardingSessionModel', () => {
  const USER_UUID = '019538a0-0000-7000-8000-000000000001';

  describe('Given a session created via reconstitute with all fields', () => {
    describe('When the model is accessed via getters', () => {
      it('Then it exposes id, stepData, createdAt, and updatedAt correctly', () => {
        const createdAt = new Date('2024-01-01T00:00:00Z');
        const updatedAt = new Date('2024-01-02T00:00:00Z');
        const stepData = { '0': { path: 'CREATE' }, '1': { acceptedTyC: true } };

        const session = OnboardingSessionModel.reconstitute({
          id: 'session-uuid-recon',
          userUUID: USER_UUID,
          path: OnboardingPath.CREATE,
          currentStep: 1,
          stepData,
          invitationCode: null,
          status: OnboardingStatus.IN_PROGRESS,
          createdAt,
          updatedAt,
        });

        expect(session.id).toBe('session-uuid-recon');
        expect(session.stepData).toEqual(stepData);
        expect(session.createdAt).toEqual(createdAt);
        expect(session.updatedAt).toEqual(updatedAt);
      });
    });
  });

  describe('Given a newly created session', () => {
    describe('When updatedAt is read after calling saveStep', () => {
      it('Then updatedAt reflects the most recent mutation', () => {
        const before = new Date();
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.saveStep(0, { path: 'CREATE' });
        const after = new Date();

        expect(session.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(session.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime() + 5);
      });
    });
  });

  describe('Given a session where step 0 is saved with an unrecognised path value', () => {
    describe('When saveStep is called with an unknown path string', () => {
      it('Then path remains null', () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.saveStep(0, { path: 'UNKNOWN' });

        expect(session.path).toBeNull();
      });
    });
  });

  describe('Given a session where step 0 is saved without a path key', () => {
    describe('When saveStep is called with empty step data', () => {
      it('Then path defaults to null', () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.saveStep(0, {});

        expect(session.path).toBeNull();
      });
    });
  });
});

describe('TenantInvitationModel', () => {
  const makeInvitation = (overrides: Record<string, unknown> = {}): TenantInvitationModel =>
    TenantInvitationModel.reconstitute({
      id: 'inv-uuid-1',
      tenantId: 42,
      tenantUUID: 'tenant-uuid-42',
      tenantName: 'Ferretería El Clavo',
      invitedBy: 7,
      email: 'user@empresa.mx',
      role: 'MANAGER',
      token: 'tok-abc123',
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      createdAt: new Date('2024-01-01T00:00:00Z'),
      ...overrides,
    });

  describe('Given a reconstituted invitation', () => {
    describe('When all getters are accessed', () => {
      it('Then they return the expected values', () => {
        const acceptedAt = new Date('2024-01-03T00:00:00Z');
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
        const invitation = makeInvitation({ acceptedAt, expiresAt });

        expect(invitation.invitedBy).toBe(7);
        expect(invitation.email).toBe('user@empresa.mx');
        expect(invitation.token).toBe('tok-abc123');
        expect(invitation.acceptedAt).toEqual(acceptedAt);
        expect(invitation.expiresAt).toEqual(expiresAt);
      });
    });
  });
});
