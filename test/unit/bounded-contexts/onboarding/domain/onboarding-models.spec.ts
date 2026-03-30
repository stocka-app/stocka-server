import { OnboardingSessionModel } from '@onboarding/domain/models/onboarding-session.model';
import { TenantInvitationModel } from '@onboarding/domain/models/tenant-invitation.model';
import { OnboardingPath } from '@onboarding/domain/enums/onboarding-path.enum';
import { OnboardingStatus } from '@onboarding/domain/enums/onboarding-status.enum';
import { InvitationEmailMismatchError } from '@onboarding/domain/errors/invitation-email-mismatch.error';
import { InvitationExpiredError } from '@onboarding/domain/errors/invitation-expired.error';
import { OnboardingNotFoundError } from '@onboarding/domain/errors/onboarding-not-found.error';

describe('OnboardingSessionModel', () => {
  const USER_UUID = '019538a0-0000-7000-8000-000000000001';

  describe('Given a session created via reconstitute with all fields', () => {
    describe('When the model is accessed via getters', () => {
      it('Then it exposes id, stepData, createdAt, and updatedAt correctly', () => {
        const createdAt = new Date('2024-01-01T00:00:00Z');
        const updatedAt = new Date('2024-01-02T00:00:00Z');
        const stepData = { path: { path: 'CREATE' }, consents: { acceptedTyC: true } };

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
    describe('When updatedAt is read after calling saveProgress', () => {
      it('Then updatedAt reflects the most recent mutation', () => {
        const before = new Date();
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.saveProgress('path', { path: 'CREATE' });
        const after = new Date();

        expect(session.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(session.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime() + 5);
      });
    });
  });

  describe('Given a session where path section is saved with an unrecognised path value', () => {
    describe('When saveProgress is called with an unknown path string', () => {
      it('Then path remains null', () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.saveProgress('path', { path: 'UNKNOWN' });

        expect(session.path).toBeNull();
      });
    });
  });

  describe('Given a session where path section is saved without a path key', () => {
    describe('When saveProgress is called with empty section data', () => {
      it('Then path defaults to null', () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.saveProgress('path', {});

        expect(session.path).toBeNull();
      });
    });
  });

  describe('Given a session where saveProgress is called with a currentStep', () => {
    describe('When currentStep is greater than the existing one', () => {
      it('Then currentStep advances', () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.saveProgress('path', { path: 'CREATE' }, 0);
        session.saveProgress('businessProfile', { name: 'Mi Tienda' }, 3);

        expect(session.currentStep).toBe(3);
      });
    });

    describe('When currentStep is less than the existing one', () => {
      it('Then currentStep does not regress', () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.saveProgress('path', { path: 'CREATE' }, 3);
        session.saveProgress('consents', { acceptedTyC: true }, 1);

        expect(session.currentStep).toBe(3);
      });
    });
  });

  describe('Given a session where a non-path section is saved', () => {
    describe('When saveProgress is called for consents', () => {
      it('Then path and invitationCode remain unchanged', () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.saveProgress('consents', { acceptedTyC: true });

        expect(session.path).toBeNull();
        expect(session.invitationCode).toBeNull();
      });
    });
  });

  describe('Given an in-progress session', () => {
    describe('When markCompleted is called', () => {
      it('Then the status changes to COMPLETED and updatedAt is refreshed', () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        expect(session.isCompleted()).toBe(false);
        expect(session.status).toBe(OnboardingStatus.IN_PROGRESS);

        const before = new Date();
        session.markCompleted();
        const after = new Date();

        expect(session.isCompleted()).toBe(true);
        expect(session.status).toBe(OnboardingStatus.COMPLETED);
        expect(session.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(session.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime() + 5);
      });
    });
  });

  describe('Given a session with saved section data', () => {
    describe('When getSectionData is called for an existing section', () => {
      it('Then it returns the data for that section', () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.saveProgress('consents', { acceptedTyC: true });

        const data = session.getSectionData('consents');
        expect(data).toEqual({ acceptedTyC: true });
      });
    });

    describe('When getSectionData is called for a non-existent section', () => {
      it('Then it returns null', () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });

        expect(session.getSectionData('nonExistent')).toBeNull();
      });
    });
  });

  describe('Given a session where path section includes JOIN with invitationCode', () => {
    describe('When saveProgress is called with path JOIN', () => {
      it('Then path is set to JOIN and invitationCode is captured', () => {
        const session = OnboardingSessionModel.create({ userUUID: USER_UUID });
        session.saveProgress('path', { path: 'JOIN', invitationCode: 'INV-ABC123' });

        expect(session.path).toBe(OnboardingPath.JOIN);
        expect(session.invitationCode).toBe('INV-ABC123');
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

describe('Onboarding domain errors', () => {
  describe('Given InvitationEmailMismatchError', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code and message', () => {
        const error = new InvitationEmailMismatchError();
        expect(error.errorCode).toBe('INVITATION_EMAIL_MISMATCH');
        expect(error.message).toContain('does not match the invitation');
      });
    });
  });

  describe('Given InvitationExpiredError', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code and message', () => {
        const error = new InvitationExpiredError();
        expect(error.errorCode).toBe('INVITATION_EXPIRED');
        expect(error.message).toBe('Invitation has expired');
      });
    });
  });

  describe('Given OnboardingNotFoundError', () => {
    describe('When instantiated', () => {
      it('Then it has the correct error code and message', () => {
        const error = new OnboardingNotFoundError();
        expect(error.errorCode).toBe('ONBOARDING_NOT_FOUND');
        expect(error.message).toContain('Onboarding session not found');
      });
    });
  });
});
