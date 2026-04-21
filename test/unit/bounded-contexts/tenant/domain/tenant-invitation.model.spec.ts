import { TenantInvitationModel } from '@tenant/domain/models/tenant-invitation.model';

const BASE_PROPS = {
  id: 'inv-uuid-1',
  tenantId: 42,
  tenantUUID: 'tenant-uuid-42',
  tenantName: 'Ferretería El Clavo',
  invitedBy: 1,
  email: 'invited@empresa.mx',
  role: 'MANAGER',
  token: 'some-token-value',
  acceptedAt: null,
  expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
  createdAt: new Date(),
};

describe('TenantInvitationModel', () => {
  describe('Given valid reconstitution props', () => {
    describe('When reconstituting the model', () => {
      it('Then all getters return the correct values', () => {
        const model = TenantInvitationModel.reconstitute(BASE_PROPS);

        expect(model.id).toBe(BASE_PROPS.id);
        expect(model.tenantId).toBe(BASE_PROPS.tenantId);
        expect(model.tenantUUID).toBe(BASE_PROPS.tenantUUID);
        expect(model.tenantName.getValue()).toBe(BASE_PROPS.tenantName);
        expect(model.invitedBy).toBe(BASE_PROPS.invitedBy);
        expect(model.email).toBe(BASE_PROPS.email);
        expect(model.role).toBe(BASE_PROPS.role);
        expect(model.token.getValue()).toBe(BASE_PROPS.token);
        expect(model.acceptedAt).toBeNull();
        expect(model.expiresAt).toBe(BASE_PROPS.expiresAt);
        expect(model.createdAt).toBe(BASE_PROPS.createdAt);
      });
    });
  });

  describe('Given valid creation props', () => {
    describe('When creating a new invitation', () => {
      it('Then it creates a model with empty id and null acceptedAt', () => {
        const model = TenantInvitationModel.create({
          tenantId: 42,
          tenantUUID: 'tenant-uuid-42',
          tenantName: 'Ferretería El Clavo',
          invitedBy: 1,
          email: 'new@empresa.mx',
          role: 'VIEWER',
          token: 'new-token',
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        });

        expect(model.id).toBe('');
        expect(model.email).toBe('new@empresa.mx');
        expect(model.role).toBe('VIEWER');
        expect(model.acceptedAt).toBeNull();
        expect(model.createdAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Given an invitation that has not expired', () => {
    describe('When checking isExpired', () => {
      it('Then it returns false', () => {
        const model = TenantInvitationModel.reconstitute({
          ...BASE_PROPS,
          expiresAt: new Date(Date.now() + 1000),
        });
        expect(model.isExpired()).toBe(false);
      });
    });
  });

  describe('Given an invitation that has expired', () => {
    describe('When checking isExpired', () => {
      it('Then it returns true', () => {
        const model = TenantInvitationModel.reconstitute({
          ...BASE_PROPS,
          expiresAt: new Date(Date.now() - 1000),
        });
        expect(model.isExpired()).toBe(true);
      });
    });
  });

  describe('Given an invitation that has not been accepted', () => {
    describe('When checking isAlreadyAccepted', () => {
      it('Then it returns false', () => {
        const model = TenantInvitationModel.reconstitute({ ...BASE_PROPS, acceptedAt: null });
        expect(model.isAlreadyAccepted()).toBe(false);
      });
    });
  });

  describe('Given an invitation that has been accepted', () => {
    describe('When checking isAlreadyAccepted', () => {
      it('Then it returns true', () => {
        const model = TenantInvitationModel.reconstitute({
          ...BASE_PROPS,
          acceptedAt: new Date(),
        });
        expect(model.isAlreadyAccepted()).toBe(true);
      });
    });
  });

  describe('Given an invitation for a specific email', () => {
    describe('When comparing with the same email (case-insensitive)', () => {
      it('Then emailMatches returns true', () => {
        const model = TenantInvitationModel.reconstitute(BASE_PROPS);
        expect(model.emailMatches('INVITED@empresa.mx')).toBe(true);
        expect(model.emailMatches('invited@empresa.mx')).toBe(true);
      });
    });

    describe('When comparing with a different email', () => {
      it('Then emailMatches returns false', () => {
        const model = TenantInvitationModel.reconstitute(BASE_PROPS);
        expect(model.emailMatches('other@empresa.mx')).toBe(false);
      });
    });
  });
});
