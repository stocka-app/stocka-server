import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { TenantProfileModel } from '@tenant/domain/models/tenant-profile.model';
import { TenantConfigModel } from '@tenant/domain/models/tenant-config.model';

// ── TenantMemberModel ──────────────────────────────────────────────────────────

describe('TenantMemberModel', () => {
  describe('Given TenantMemberModel.create() is called with valid props', () => {
    describe('When creating a new OWNER member', () => {
      let member: TenantMemberModel;

      beforeEach(() => {
        member = TenantMemberModel.create({
          tenantId: 1,
          userId: 42,
          userUUID: '550e8400-e29b-41d4-a716-446655440000',
          role: 'OWNER',
        });
      });

      it('Then the member has a uuid and no id', () => {
        expect(member.uuid).toBeDefined();
        expect(member.id).toBeUndefined();
      });

      it('Then the tenantId and userId are set', () => {
        expect(member.tenantId).toBe(1);
        expect(member.userId).toBe(42);
        expect(member.userUUID).toBe('550e8400-e29b-41d4-a716-446655440000');
      });

      it('Then the role is OWNER', () => {
        expect(member.role.toString()).toBe('OWNER');
        expect(member.isOwner()).toBe(true);
      });

      it('Then the status is active', () => {
        expect(member.status.toString()).toBe('active');
        expect(member.isActive()).toBe(true);
      });

      it('Then invitedBy is null and joinedAt is set', () => {
        expect(member.invitedBy).toBeNull();
        expect(member.joinedAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Given TenantMemberModel.reconstitute() is called with persisted data', () => {
    describe('When hydrating from storage', () => {
      it('Then all properties are restored', () => {
        const member = TenantMemberModel.reconstitute({
          id: 10,
          uuid: '550e8400-e29b-41d4-a716-446655440001',
          tenantId: 1,
          userId: 42,
          userUUID: '550e8400-e29b-41d4-a716-446655440000',
          role: 'VIEWER',
          status: 'pending',
          invitedBy: 5,
          joinedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          archivedAt: null,
        });

        expect(member.id).toBe(10);
        expect(member.tenantId).toBe(1);
        expect(member.userId).toBe(42);
        expect(member.role.toString()).toBe('VIEWER');
        expect(member.status.toString()).toBe('pending');
        expect(member.invitedBy).toBe(5);
        expect(member.joinedAt).toBeNull();
        expect(member.isOwner()).toBe(false);
        expect(member.isActive()).toBe(false);
      });
    });
  });
});

// ── TenantProfileModel ────────────────────────────────────────────────────────

describe('TenantProfileModel', () => {
  describe('Given TenantProfileModel.createEmpty() is called', () => {
    describe('When creating an empty profile for a tenant', () => {
      let profile: TenantProfileModel;

      beforeEach(() => {
        profile = TenantProfileModel.createEmpty(1);
      });

      it('Then the tenantId is set', () => {
        expect(profile.tenantId).toBe(1);
      });

      it('Then all optional fields are null', () => {
        expect(profile.giro).toBeNull();
        expect(profile.phone).toBeNull();
        expect(profile.contactEmail).toBeNull();
        expect(profile.website).toBeNull();
        expect(profile.addressLine1).toBeNull();
        expect(profile.city).toBeNull();
        expect(profile.state).toBeNull();
        expect(profile.postalCode).toBeNull();
        expect(profile.logoUrl).toBeNull();
      });

      it('Then the profile has a uuid and no id', () => {
        expect(profile.uuid).toBeDefined();
        expect(profile.id).toBeUndefined();
      });
    });
  });

  describe('Given TenantProfileModel.reconstitute() is called with persisted data', () => {
    describe('When hydrating from storage', () => {
      it('Then all properties are restored', () => {
        const profile = TenantProfileModel.reconstitute({
          id: 5,
          uuid: '550e8400-e29b-41d4-a716-446655440002',
          tenantId: 1,
          giro: 'Tecnologia',
          phone: '+5215512345678',
          contactEmail: 'contacto@tienda.com',
          website: 'https://tienda.com',
          addressLine1: 'Calle 123',
          city: 'CDMX',
          state: 'CDMX',
          postalCode: '06600',
          logoUrl: 'https://cdn.example.com/logo.png',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          archivedAt: null,
        });

        expect(profile.id).toBe(5);
        expect(profile.tenantId).toBe(1);
        expect(profile.giro).toBe('Tecnologia');
        expect(profile.phone).toBe('+5215512345678');
        expect(profile.contactEmail).toBe('contacto@tienda.com');
        expect(profile.website).toBe('https://tienda.com');
        expect(profile.addressLine1).toBe('Calle 123');
        expect(profile.city).toBe('CDMX');
        expect(profile.state).toBe('CDMX');
        expect(profile.postalCode).toBe('06600');
        expect(profile.logoUrl).toBe('https://cdn.example.com/logo.png');
      });
    });
  });
});

// ── TenantConfigModel ─────────────────────────────────────────────────────────

describe('TenantConfigModel', () => {
  describe('Given TenantConfigModel.createFreeDefaults() is called', () => {
    describe('When creating default config for a free-tier tenant', () => {
      let config: TenantConfigModel;

      beforeEach(() => {
        config = TenantConfigModel.createFreeDefaults(1);
      });

      it('Then the tenantId is set', () => {
        expect(config.tenantId).toBe(1);
      });

      it('Then the tier is FREE', () => {
        expect(config.tier.toString()).toBe('FREE');
      });

      it('Then the limits are set to free-tier defaults', () => {
        expect(config.maxWarehouses).toBe(0);
        expect(config.maxCustomRooms).toBe(1);
        expect(config.maxStoreRooms).toBe(1);
        expect(config.maxUsers).toBe(1);
        expect(config.maxProducts).toBe(100);
      });

      it('Then notifications are enabled', () => {
        expect(config.notificationsEnabled).toBe(true);
      });

      it('Then the materialized counters have default values', () => {
        expect(config.productCount).toBe(0);
        expect(config.storageCount).toBe(0);
        expect(config.memberCount).toBe(1);
      });

      it('Then the capabilities snapshot is null', () => {
        expect(config.capabilities).toBeNull();
        expect(config.capabilitiesBuiltAt).toBeNull();
      });

      it('Then the config has a uuid and no id', () => {
        expect(config.uuid).toBeDefined();
        expect(config.id).toBeUndefined();
      });
    });
  });

  describe('Given TenantConfigModel.reconstitute() is called with persisted data', () => {
    describe('When hydrating from storage', () => {
      it('Then all properties are restored', () => {
        const config = TenantConfigModel.reconstitute({
          id: 3,
          uuid: '550e8400-e29b-41d4-a716-446655440003',
          tenantId: 1,
          tier: 'STARTER',
          maxWarehouses: 3,
          maxCustomRooms: 3,
          maxStoreRooms: 3,
          maxUsers: 5,
          maxProducts: 1000,
          notificationsEnabled: false,
          productCount: 50,
          storageCount: 2,
          memberCount: 3,
          capabilities: null,
          capabilitiesBuiltAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          archivedAt: null,
        });

        expect(config.id).toBe(3);
        expect(config.tenantId).toBe(1);
        expect(config.tier.toString()).toBe('STARTER');
        expect(config.maxWarehouses).toBe(3);
        expect(config.maxCustomRooms).toBe(3);
        expect(config.maxStoreRooms).toBe(3);
        expect(config.maxUsers).toBe(5);
        expect(config.maxProducts).toBe(1000);
        expect(config.notificationsEnabled).toBe(false);
        expect(config.productCount).toBe(50);
        expect(config.storageCount).toBe(2);
        expect(config.memberCount).toBe(3);
        expect(config.capabilities).toBeNull();
        expect(config.capabilitiesBuiltAt).toBeNull();
      });
    });
  });

  describe('Given a TenantConfigModel without a capabilities snapshot', () => {
    describe('When updateCapabilities is called with a snapshot', () => {
      it('Then the snapshot and timestamp are stored on the model', () => {
        const config = TenantConfigModel.createFreeDefaults(1);
        const snapshot = { PRODUCT_CREATE: { enabled: true } } as never;

        config.updateCapabilities(snapshot);

        expect(config.capabilities).toBe(snapshot);
        expect(config.capabilitiesBuiltAt).toBeInstanceOf(Date);
      });
    });
  });
});
