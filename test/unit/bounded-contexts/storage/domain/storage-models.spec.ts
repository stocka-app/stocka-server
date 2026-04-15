import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';

// ── CustomRoomModel ─────────────────────────────────────────────────────────────

describe('CustomRoomModel', () => {
  describe('Given CustomRoomModel.create() is called with valid props', () => {
    describe('When creating a custom room with all fields', () => {
      it('Then all properties are set correctly', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000010',
          tenantUUID: TENANT_UUID,
          name: 'Main Office',
          description: 'Primary workspace',
          icon: 'office-icon',
          color: '#AABBCC',
          roomType: 'Office',
          address: '123 Main St',
        });

        expect(model.uuid.toString()).toBe('019538a0-0000-7000-8000-000000000010');
        expect(model.tenantUUID).toBe(TENANT_UUID);
        expect(model.name.getValue()).toBe('Main Office');
        expect(model.description?.getValue()).toBe('Primary workspace');
        expect(model.icon.getValue()).toBe('office-icon');
        expect(model.color.getValue()).toBe('#AABBCC');
        expect(model.roomType.getValue()).toBe('Office');
        expect(model.address.getValue()).toBe('123 Main St');
        expect(model.archivedAt).toBeNull();
        expect(model.frozenAt).toBeNull();
        expect(model.createdAt).toBeInstanceOf(Date);
        expect(model.updatedAt).toBeInstanceOf(Date);
      });
    });

    describe('When creating a custom room without a description', () => {
      it('Then description defaults to null', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000011',
          tenantUUID: TENANT_UUID,
          name: 'Minimal Room',
          roomType: 'Storage',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '456 Oak Ave',
        });

        expect(model.description).toBeNull();
        expect(model.icon.getValue()).toBe('icon-1');
        expect(model.color.getValue()).toBe('#AABBCC');
        expect(model.address.getValue()).toBe('456 Oak Ave');
      });
    });
  });

  describe('Given CustomRoomModel.update() is called', () => {
    describe('When updating name and description', () => {
      it('Then the updated model has the new values and preserves unchanged fields', () => {
        const original = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000013',
          tenantUUID: TENANT_UUID,
          name: 'Original',
          roomType: 'Office',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '100 Main St',
        });

        const updated = original.update({ name: 'Updated', description: 'New desc' });

        expect(updated.name.getValue()).toBe('Updated');
        expect(updated.description?.getValue()).toBe('New desc');
        expect(updated.icon.getValue()).toBe('icon-1');
        expect(updated.color.getValue()).toBe('#AABBCC');
        expect(updated.address.getValue()).toBe('100 Main St');
      });
    });

    describe('When clearing description', () => {
      it('Then description becomes null', () => {
        const original = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000014',
          tenantUUID: TENANT_UUID,
          name: 'Room',
          description: 'Old desc',
          roomType: 'Office',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '100 St',
        });

        const updated = original.update({ description: null });

        expect(updated.description).toBeNull();
        expect(updated.name.getValue()).toBe('Room');
      });
    });

    describe('When updating icon, color, roomType, and address', () => {
      it('Then all spatial and visual fields are changed', () => {
        const original = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000015',
          tenantUUID: TENANT_UUID,
          name: 'Room',
          roomType: 'Office',
          icon: 'old-icon',
          color: '#000000',
          address: '1 Old St',
        });

        const updated = original.update({
          icon: 'new-icon',
          color: '#FFFFFF',
          roomType: 'Warehouse',
          address: '2 New Ave',
        });

        expect(updated.icon.getValue()).toBe('new-icon');
        expect(updated.color.getValue()).toBe('#FFFFFF');
        expect(updated.roomType.getValue()).toBe('Warehouse');
        expect(updated.address.getValue()).toBe('2 New Ave');
        expect(updated.name.getValue()).toBe('Room');
      });
    });
  });

  describe('Given CustomRoomModel lifecycle methods', () => {
    describe('When checking status of a freshly created model', () => {
      it('Then status is ACTIVE', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000016',
          tenantUUID: TENANT_UUID,
          name: 'Fresh',
          roomType: 'Office',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        expect(model.status).toBe(StorageStatus.ACTIVE);
        expect(model.isArchived()).toBe(false);
        expect(model.isFrozen()).toBe(false);
      });
    });

    describe('When markArchived is called', () => {
      it('Then the model is archived with a new archivedAt date', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000017',
          tenantUUID: TENANT_UUID,
          name: 'To Archive',
          roomType: 'Office',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const archived = model.markArchived();

        expect(archived.isArchived()).toBe(true);
        expect(archived.archivedAt).toBeInstanceOf(Date);
        expect(archived.status).toBe(StorageStatus.ARCHIVED);
      });
    });

    describe('When markFrozen is called', () => {
      it('Then the model is frozen with a new frozenAt date and status is FROZEN', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000019',
          tenantUUID: TENANT_UUID,
          name: 'To Freeze',
          roomType: 'Office',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const frozen = model.markFrozen();

        expect(frozen.isFrozen()).toBe(true);
        expect(frozen.frozenAt).toBeInstanceOf(Date);
        expect(frozen.status).toBe(StorageStatus.FROZEN);
      });
    });

    describe('When markUnfrozen is called on a frozen model', () => {
      it('Then frozenAt is null and status is ACTIVE', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000020',
          tenantUUID: TENANT_UUID,
          name: 'To Unfreeze',
          roomType: 'Office',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const frozen = model.markFrozen();
        const unfrozen = frozen.markUnfrozen();

        expect(unfrozen.isFrozen()).toBe(false);
        expect(unfrozen.frozenAt).toBeNull();
        expect(unfrozen.status).toBe(StorageStatus.ACTIVE);
      });
    });

    describe('When markRestored is called on an archived model', () => {
      it('Then archivedAt is cleared and status returns to ACTIVE', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000071',
          tenantUUID: TENANT_UUID,
          name: 'To Restore',
          roomType: 'Office',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const restored = model.markArchived().markRestored();

        expect(restored.isArchived()).toBe(false);
        expect(restored.archivedAt).toBeNull();
        expect(restored.status).toBe(StorageStatus.ACTIVE);
      });

      it('Then a frozen-then-archived model lands ACTIVE on restore (markArchived clears frozenAt)', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000072',
          tenantUUID: TENANT_UUID,
          name: 'Frozen Then Archived',
          roomType: 'Office',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const restored = model.markFrozen().markArchived().markRestored();

        expect(restored.archivedAt).toBeNull();
        expect(restored.frozenAt).toBeNull();
        expect(restored.status).toBe(StorageStatus.ACTIVE);
      });
    });

    describe('When markRestored is called on an already active model', () => {
      it('Then the model stays ACTIVE with archivedAt null (defensive idempotency)', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000073',
          tenantUUID: TENANT_UUID,
          name: 'Already Active',
          roomType: 'Office',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const restored = model.markRestored();

        expect(restored.isArchived()).toBe(false);
        expect(restored.archivedAt).toBeNull();
        expect(restored.status).toBe(StorageStatus.ACTIVE);
      });
    });

    describe('When archive then restore is applied', () => {
      it('Then the model equals the original modulo updatedAt', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000074',
          tenantUUID: TENANT_UUID,
          name: 'Archive Then Restore',
          roomType: 'Office',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const roundTrip = model.markArchived().markRestored();

        expect(roundTrip.uuid.toString()).toBe(model.uuid.toString());
        expect(roundTrip.name.getValue()).toBe(model.name.getValue());
        expect(roundTrip.roomType.getValue()).toBe(model.roomType.getValue());
        expect(roundTrip.archivedAt).toBeNull();
        expect(roundTrip.frozenAt).toBeNull();
        expect(roundTrip.status).toBe(StorageStatus.ACTIVE);
      });
    });
  });

  describe('Given CustomRoomModel.reconstitute() is called with persisted data', () => {
    describe('When hydrating from storage', () => {
      it('Then all properties are restored', () => {
        const now = new Date('2024-06-01');
        const model = CustomRoomModel.reconstitute({
          uuid: new UUIDVO('019538a0-0000-7000-8000-000000000012'),
          tenantUUID: TENANT_UUID,
          name: StorageNameVO.create('Restored Room'),
          description: StorageDescriptionVO.create('A restored room'),
          icon: StorageIconVO.create('icon-x'),
          color: StorageColorVO.create('#112233'),
          roomType: RoomTypeNameVO.create('Kitchen'),
          address: StorageAddressVO.create('456 Oak Ave'),
          archivedAt: null,
          frozenAt: null,
          createdAt: now,
          updatedAt: now,
        });

        expect(model.uuid.toString()).toBe('019538a0-0000-7000-8000-000000000012');
        expect(model.name.getValue()).toBe('Restored Room');
        expect(model.description?.getValue()).toBe('A restored room');
        expect(model.icon.getValue()).toBe('icon-x');
        expect(model.color.getValue()).toBe('#112233');
        expect(model.roomType.getValue()).toBe('Kitchen');
        expect(model.address.getValue()).toBe('456 Oak Ave');
        expect(model.createdAt).toEqual(now);
      });
    });

    describe('When reconstituted with frozenAt set', () => {
      it('Then isFrozen is true and status is FROZEN', () => {
        const model = CustomRoomModel.reconstitute({
          uuid: new UUIDVO('019538a0-0000-7000-8000-000000000018'),
          tenantUUID: TENANT_UUID,
          name: StorageNameVO.create('Frozen Room'),
          description: null,
          icon: StorageIconVO.create('icon-1'),
          color: StorageColorVO.create('#AABBCC'),
          roomType: RoomTypeNameVO.create('Office'),
          address: StorageAddressVO.create('1 St'),
          archivedAt: null,
          frozenAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        expect(model.isFrozen()).toBe(true);
        expect(model.status).toBe(StorageStatus.FROZEN);
      });
    });
  });
});

// ── StoreRoomModel ──────────────────────────────────────────────────────────────

describe('StoreRoomModel', () => {
  describe('Given StoreRoomModel.create() is called with valid props', () => {
    describe('When creating a store room with all fields', () => {
      it('Then all properties are set correctly', () => {
        const model = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000020',
          tenantUUID: TENANT_UUID,
          name: 'Main Store',
          description: 'Main storage area',
          icon: 'store-icon',
          color: '#DDEEFF',
          address: '789 Elm Rd',
        });

        expect(model.uuid.toString()).toBe('019538a0-0000-7000-8000-000000000020');
        expect(model.tenantUUID).toBe(TENANT_UUID);
        expect(model.name.getValue()).toBe('Main Store');
        expect(model.description?.getValue()).toBe('Main storage area');
        expect(model.icon.getValue()).toBe('store-icon');
        expect(model.color.getValue()).toBe('#DDEEFF');
        expect(model.address.getValue()).toBe('789 Elm Rd');
        expect(model.archivedAt).toBeNull();
        expect(model.frozenAt).toBeNull();
        expect(model.createdAt).toBeInstanceOf(Date);
      });
    });

    describe('When creating a store room without a description', () => {
      it('Then description defaults to null', () => {
        const model = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000021',
          tenantUUID: TENANT_UUID,
          name: 'Minimal Store',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '100 Main St',
        });

        expect(model.description).toBeNull();
        expect(model.icon.getValue()).toBe('icon-1');
        expect(model.color.getValue()).toBe('#AABBCC');
        expect(model.address.getValue()).toBe('100 Main St');
      });
    });
  });

  describe('Given StoreRoomModel.update() is called', () => {
    describe('When updating with partial props', () => {
      it('Then only the provided fields are changed', () => {
        const original = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000025',
          tenantUUID: TENANT_UUID,
          name: 'Store A',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '100 Main St',
        });

        const updated = original.update({ name: 'Store B', color: '#112233' });

        expect(updated.name.getValue()).toBe('Store B');
        expect(updated.color.getValue()).toBe('#112233');
        expect(updated.icon.getValue()).toBe('icon-1');
        expect(updated.address.getValue()).toBe('100 Main St');
      });
    });

    describe('When updating description to a new non-null value', () => {
      it('Then the description is replaced', () => {
        const original = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000026',
          tenantUUID: TENANT_UUID,
          name: 'Store',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '100 Main St',
        });

        const updated = original.update({ description: 'Fresh desc' });

        expect(updated.description?.getValue()).toBe('Fresh desc');
      });
    });

    describe('When clearing description', () => {
      it('Then description becomes null', () => {
        const original = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000027',
          tenantUUID: TENANT_UUID,
          name: 'Store',
          description: 'Old desc',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '100 St',
        });

        const updated = original.update({ description: null });

        expect(updated.description).toBeNull();
        expect(updated.name.getValue()).toBe('Store');
      });
    });

    describe('When updating icon and address', () => {
      it('Then icon and address are updated', () => {
        const original = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000028',
          tenantUUID: TENANT_UUID,
          name: 'Store',
          icon: 'old-icon',
          color: '#AABBCC',
          address: '1 Old St',
        });

        const updated = original.update({ icon: 'new-icon', address: '2 New Ave' });

        expect(updated.icon.getValue()).toBe('new-icon');
        expect(updated.address.getValue()).toBe('2 New Ave');
        expect(updated.color.getValue()).toBe('#AABBCC');
      });
    });
  });

  describe('Given StoreRoomModel lifecycle methods', () => {
    describe('When markArchived is called', () => {
      it('Then returns an archived model', () => {
        const model = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000029',
          tenantUUID: TENANT_UUID,
          name: 'To Archive',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const archived = model.markArchived();

        expect(archived.isArchived()).toBe(true);
        expect(archived.status).toBe(StorageStatus.ARCHIVED);
      });
    });

    describe('When markFrozen is called', () => {
      it('Then frozenAt is set and status is FROZEN', () => {
        const model = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000031',
          tenantUUID: TENANT_UUID,
          name: 'To Freeze',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const frozen = model.markFrozen();

        expect(frozen.isFrozen()).toBe(true);
        expect(frozen.frozenAt).toBeInstanceOf(Date);
        expect(frozen.status).toBe(StorageStatus.FROZEN);
      });
    });

    describe('When markUnfrozen is called on a frozen model', () => {
      it('Then frozenAt is null and status is ACTIVE', () => {
        const model = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000032',
          tenantUUID: TENANT_UUID,
          name: 'To Unfreeze',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const unfrozen = model.markFrozen().markUnfrozen();

        expect(unfrozen.isFrozen()).toBe(false);
        expect(unfrozen.frozenAt).toBeNull();
        expect(unfrozen.status).toBe(StorageStatus.ACTIVE);
      });
    });

    describe('When isFrozen is called on an archived model that also has frozenAt set', () => {
      it('Then isFrozen returns false because archived takes precedence', () => {
        const model = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000033',
          tenantUUID: TENANT_UUID,
          name: 'Archived And Frozen',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const frozenThenArchived = model.markFrozen().markArchived();

        expect(frozenThenArchived.isFrozen()).toBe(false);
        expect(frozenThenArchived.isArchived()).toBe(true);
        expect(frozenThenArchived.status).toBe(StorageStatus.ARCHIVED);
      });
    });

    describe('When markRestored is called on an archived model', () => {
      it('Then archivedAt is cleared and status returns to ACTIVE', () => {
        const model = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000081',
          tenantUUID: TENANT_UUID,
          name: 'To Restore',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const restored = model.markArchived().markRestored();

        expect(restored.isArchived()).toBe(false);
        expect(restored.archivedAt).toBeNull();
        expect(restored.status).toBe(StorageStatus.ACTIVE);
      });

      it('Then a frozen-then-archived model lands ACTIVE on restore (markArchived clears frozenAt)', () => {
        const model = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000082',
          tenantUUID: TENANT_UUID,
          name: 'Frozen Then Archived',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const restored = model.markFrozen().markArchived().markRestored();

        expect(restored.archivedAt).toBeNull();
        expect(restored.frozenAt).toBeNull();
        expect(restored.status).toBe(StorageStatus.ACTIVE);
      });
    });
  });

  describe('Given StoreRoomModel.reconstitute() is called with persisted data', () => {
    describe('When hydrating from storage', () => {
      it('Then all properties are restored', () => {
        const now = new Date('2024-07-01');
        const model = StoreRoomModel.reconstitute({
          uuid: new UUIDVO('019538a0-0000-7000-8000-000000000030'),
          tenantUUID: TENANT_UUID,
          name: StorageNameVO.create('Restored Store'),
          description: null,
          icon: StorageIconVO.create('store-icon'),
          color: StorageColorVO.create('#334455'),
          address: StorageAddressVO.create('100 Industrial'),
          archivedAt: null,
          frozenAt: null,
          createdAt: now,
          updatedAt: now,
        });

        expect(model.uuid.toString()).toBe('019538a0-0000-7000-8000-000000000030');
        expect(model.name.getValue()).toBe('Restored Store');
        expect(model.description).toBeNull();
        expect(model.address.getValue()).toBe('100 Industrial');
        expect(model.createdAt).toEqual(now);
      });
    });
  });
});

// ── WarehouseModel ──────────────────────────────────────────────────────────────

describe('WarehouseModel', () => {
  describe('Given WarehouseModel.create() is called with valid props', () => {
    describe('When creating a warehouse with all fields', () => {
      it('Then all properties are set correctly', () => {
        const model = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000040',
          tenantUUID: TENANT_UUID,
          name: 'Central Warehouse',
          description: 'Main distribution center',
          icon: 'warehouse-icon',
          color: '#001122',
          address: '200 Warehouse Blvd',
        });

        expect(model.uuid.toString()).toBe('019538a0-0000-7000-8000-000000000040');
        expect(model.tenantUUID).toBe(TENANT_UUID);
        expect(model.name.getValue()).toBe('Central Warehouse');
        expect(model.description?.getValue()).toBe('Main distribution center');
        expect(model.icon.getValue()).toBe('warehouse-icon');
        expect(model.color.getValue()).toBe('#001122');
        expect(model.address.getValue()).toBe('200 Warehouse Blvd');
        expect(model.archivedAt).toBeNull();
        expect(model.frozenAt).toBeNull();
        expect(model.createdAt).toBeInstanceOf(Date);
      });
    });

    describe('When creating a warehouse without a description', () => {
      it('Then description defaults to null and id is the sentinel 0', () => {
        const model = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000041',
          tenantUUID: TENANT_UUID,
          name: 'Minimal Warehouse',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '300 Depot Ln',
        });

        expect(model.description).toBeNull();
        expect(model.id).toBeUndefined();
        expect(model.icon.getValue()).toBe('icon-1');
        expect(model.color.getValue()).toBe('#AABBCC');
        expect(model.address.getValue()).toBe('300 Depot Ln');
      });
    });
  });

  describe('Given WarehouseModel.update() is called', () => {
    describe('When updating with partial props', () => {
      it('Then only the provided fields are changed', () => {
        const original = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000042',
          tenantUUID: TENANT_UUID,
          name: 'WH A',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '100 Main St',
        });

        const updated = original.update({ name: 'WH B', address: '200 New Ave' });

        expect(updated.name.getValue()).toBe('WH B');
        expect(updated.address.getValue()).toBe('200 New Ave');
        expect(updated.icon.getValue()).toBe('icon-1');
        expect(updated.color.getValue()).toBe('#AABBCC');
      });
    });

    describe('When clearing description', () => {
      it('Then description becomes null', () => {
        const original = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000043',
          tenantUUID: TENANT_UUID,
          name: 'WH',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '100 St',
          description: 'Old desc',
        });

        const updated = original.update({ description: null });

        expect(updated.description).toBeNull();
      });
    });

    describe('When updating description to a new non-null value', () => {
      it('Then the description is replaced', () => {
        const original = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000044',
          tenantUUID: TENANT_UUID,
          name: 'WH',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '100 St',
        });

        const updated = original.update({ description: 'New desc' });

        expect(updated.description?.getValue()).toBe('New desc');
      });
    });

    describe('When updating icon and color', () => {
      it('Then icon and color are updated', () => {
        const original = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000045',
          tenantUUID: TENANT_UUID,
          name: 'WH',
          icon: 'old-icon',
          color: '#000000',
          address: '100 St',
        });

        const updated = original.update({ icon: 'new-icon', color: '#FFFFFF' });

        expect(updated.icon.getValue()).toBe('new-icon');
        expect(updated.color.getValue()).toBe('#FFFFFF');
        expect(updated.address.getValue()).toBe('100 St');
      });
    });
  });

  describe('Given WarehouseModel lifecycle methods', () => {
    describe('When checking status of a freshly created model', () => {
      it('Then status is ACTIVE', () => {
        const model = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000046',
          tenantUUID: TENANT_UUID,
          name: 'Fresh WH',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        expect(model.status).toBe(StorageStatus.ACTIVE);
        expect(model.isArchived()).toBe(false);
        expect(model.isFrozen()).toBe(false);
      });
    });

    describe('When markArchived is called', () => {
      it('Then returns an archived model', () => {
        const model = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000047',
          tenantUUID: TENANT_UUID,
          name: 'To Archive',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const archived = model.markArchived();

        expect(archived.isArchived()).toBe(true);
        expect(archived.archivedAt).toBeInstanceOf(Date);
        expect(archived.status).toBe(StorageStatus.ARCHIVED);
      });
    });

    describe('When markFrozen is called', () => {
      it('Then frozenAt is set and status is FROZEN', () => {
        const model = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000049',
          tenantUUID: TENANT_UUID,
          name: 'To Freeze',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const frozen = model.markFrozen();

        expect(frozen.isFrozen()).toBe(true);
        expect(frozen.frozenAt).toBeInstanceOf(Date);
        expect(frozen.status).toBe(StorageStatus.FROZEN);
      });
    });

    describe('When markUnfrozen is called on a frozen model', () => {
      it('Then frozenAt is null and status is ACTIVE', () => {
        const model = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000051',
          tenantUUID: TENANT_UUID,
          name: 'To Unfreeze',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const unfrozen = model.markFrozen().markUnfrozen();

        expect(unfrozen.isFrozen()).toBe(false);
        expect(unfrozen.frozenAt).toBeNull();
        expect(unfrozen.status).toBe(StorageStatus.ACTIVE);
      });
    });

    describe('When markRestored is called on an archived model', () => {
      it('Then archivedAt is cleared and status returns to ACTIVE', () => {
        const model = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000091',
          tenantUUID: TENANT_UUID,
          name: 'To Restore',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const restored = model.markArchived().markRestored();

        expect(restored.isArchived()).toBe(false);
        expect(restored.archivedAt).toBeNull();
        expect(restored.status).toBe(StorageStatus.ACTIVE);
      });

      it('Then a frozen-then-archived model lands ACTIVE on restore (markArchived clears frozenAt)', () => {
        const model = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000092',
          tenantUUID: TENANT_UUID,
          name: 'Frozen Then Archived',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '1 St',
        });

        const restored = model.markFrozen().markArchived().markRestored();

        expect(restored.archivedAt).toBeNull();
        expect(restored.frozenAt).toBeNull();
        expect(restored.status).toBe(StorageStatus.ACTIVE);
      });
    });
  });

  describe('Given WarehouseModel.reconstitute() is called with persisted data', () => {
    describe('When hydrating from storage', () => {
      it('Then all properties are restored', () => {
        const now = new Date('2024-08-01');
        const model = WarehouseModel.reconstitute({
          id: 3,
          uuid: new UUIDVO('019538a0-0000-7000-8000-000000000048'),
          tenantUUID: TENANT_UUID,
          name: StorageNameVO.create('Restored Warehouse'),
          description: null,
          icon: StorageIconVO.create('wh-icon'),
          color: StorageColorVO.create('#667788'),
          address: StorageAddressVO.create('300 Depot Lane'),
          archivedAt: null,
          frozenAt: null,
          createdAt: now,
          updatedAt: now,
        });

        expect(model.id).toBe(3);
        expect(model.uuid.toString()).toBe('019538a0-0000-7000-8000-000000000048');
        expect(model.name.getValue()).toBe('Restored Warehouse');
        expect(model.description).toBeNull();
        expect(model.address.getValue()).toBe('300 Depot Lane');
        expect(model.createdAt).toEqual(now);
      });
    });
  });
});
