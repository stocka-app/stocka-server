import { TenantConfigModel } from '@tenant/domain/models/tenant-config.model';
import { TenantMemberModel } from '@tenant/domain/models/tenant-member.model';
import { TenantProfileModel } from '@tenant/domain/models/tenant-profile.model';

const TENANT_ID = 17;
const NOW = new Date('2024-06-01T00:00:00.000Z');
const CREATED_AT = new Date('2024-01-01T00:00:00.000Z');
const ENTRY_UUID = '019538a0-0000-7000-8000-000000000001';
const USER_UUID = '019538a0-0000-7000-8000-000000000002';

describe('TenantConfigModel getters', () => {
  describe('Given a reconstituted tenant config', () => {
    it('Then it exposes createdAt, updatedAt, and archivedAt', () => {
      const model = TenantConfigModel.reconstitute({
        id: 1,
        uuid: ENTRY_UUID,
        tenantId: TENANT_ID,
        tier: 'FREE',
        maxWarehouses: 0,
        maxCustomRooms: 0,
        maxStoreRooms: 0,
        maxUsers: 1,
        maxProducts: 100,
        notificationsEnabled: true,
        productCount: 0,
        storageCount: 0,
        memberCount: 1,
        createdAt: CREATED_AT,
        updatedAt: NOW,
        archivedAt: null,
      });

      expect(model.createdAt).toEqual(CREATED_AT);
      expect(model.updatedAt).toEqual(NOW);
      expect(model.archivedAt).toBeNull();
      expect(model.uuid.toString()).toBe(ENTRY_UUID);
    });
  });
});

describe('TenantMemberModel getters', () => {
  describe('Given a reconstituted tenant member', () => {
    it('Then it exposes createdAt, updatedAt, and archivedAt', () => {
      const model = TenantMemberModel.reconstitute({
        id: 1,
        uuid: ENTRY_UUID,
        tenantId: TENANT_ID,
        userId: 42,
        userUUID: USER_UUID,
        role: 'OWNER',
        status: 'active',
        invitedBy: null,
        joinedAt: CREATED_AT,
        createdAt: CREATED_AT,
        updatedAt: NOW,
        archivedAt: null,
      });

      expect(model.createdAt).toEqual(CREATED_AT);
      expect(model.updatedAt).toEqual(NOW);
      expect(model.archivedAt).toBeNull();
      expect(model.uuid.toString()).toBe(ENTRY_UUID);
    });
  });
});

describe('TenantProfileModel getters', () => {
  describe('Given a reconstituted tenant profile', () => {
    it('Then it exposes createdAt, updatedAt, and archivedAt', () => {
      const model = TenantProfileModel.reconstitute({
        id: 1,
        uuid: ENTRY_UUID,
        tenantId: TENANT_ID,
        giro: null,
        phone: null,
        contactEmail: null,
        website: null,
        addressLine1: null,
        city: null,
        state: null,
        postalCode: null,
        logoUrl: null,
        createdAt: CREATED_AT,
        updatedAt: NOW,
        archivedAt: null,
      });

      expect(model.createdAt).toEqual(CREATED_AT);
      expect(model.updatedAt).toEqual(NOW);
      expect(model.archivedAt).toBeNull();
    });
  });
});
