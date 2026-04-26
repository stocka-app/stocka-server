import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StoreRoomAggregate } from '@storage/domain/aggregates/store-room.aggregate';
import { WarehouseAggregate } from '@storage/domain/aggregates/warehouse.aggregate';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000099';
const STORAGE_ID = 1;
const STORAGE_UUID = '019538a0-0000-7000-8000-000000000010';

function buildWarehouse(uuid: string, name = 'WH'): WarehouseAggregate {
  return WarehouseAggregate.create({
    uuid,
    tenantUUID: TENANT_UUID,
    actorUUID: ACTOR_UUID,
    name,
    icon: 'icon',
    color: '#000000',
    address: 'addr',
  });
}

function buildStoreRoom(uuid: string, name = 'SR'): StoreRoomAggregate {
  return StoreRoomAggregate.create({
    uuid,
    tenantUUID: TENANT_UUID,
    actorUUID: ACTOR_UUID,
    name,
    icon: 'icon',
    color: '#000000',
  });
}

function buildCustomRoom(uuid: string, name = 'CR'): CustomRoomAggregate {
  return CustomRoomAggregate.create({
    uuid,
    tenantUUID: TENANT_UUID,
    actorUUID: ACTOR_UUID,
    name,
    icon: 'icon',
    color: '#000000',
    roomType: 'Office',
  });
}

describe('StorageAggregate', () => {
  describe('Given StorageAggregate.create() for a tenant', () => {
    describe('When invoked', () => {
      it('Then it produces an empty container scoped to the tenant', () => {
        const aggregate = StorageAggregate.create({ tenantUUID: TENANT_UUID });

        expect(aggregate.tenantUUID.toString()).toBe(TENANT_UUID);
        expect(aggregate.warehouses).toHaveLength(0);
        expect(aggregate.storeRooms).toHaveLength(0);
        expect(aggregate.customRooms).toHaveLength(0);
      });
    });
  });

  describe('Given StorageAggregate.reconstitute() with three populated children', () => {
    describe('When listItemViews() is called', () => {
      it('Then it returns one StorageItemView per child with correct discriminators', () => {
        const aggregate = StorageAggregate.reconstitute({
          id: STORAGE_ID,
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          warehouses: [buildWarehouse('019538a0-0000-7000-8000-00000000aaaa', 'WH-A')],
          storeRooms: [buildStoreRoom('019538a0-0000-7000-8000-00000000bbbb', 'SR-A')],
          customRooms: [buildCustomRoom('019538a0-0000-7000-8000-00000000cccc', 'CR-A')],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-06-01'),
        });

        const views = aggregate.listItemViews();
        expect(views).toHaveLength(3);

        const types = views.map((v) => v.type).sort();
        expect(types).toEqual(
          [StorageType.CUSTOM_ROOM, StorageType.STORE_ROOM, StorageType.WAREHOUSE].sort(),
        );

        for (const view of views) {
          expect(view.status).toBe(StorageStatus.ACTIVE);
          expect(view.archivedAt).toBeNull();
          expect(view.frozenAt).toBeNull();
        }

        const customRoomView = views.find((v) => v.type === StorageType.CUSTOM_ROOM);
        expect(customRoomView?.roomType).toBe('Office');
      });
    });

    describe('When findItemView(uuid) is called for an existing child', () => {
      it('Then it returns the matching view', () => {
        const warehouseUUID = '019538a0-0000-7000-8000-00000000aaaa';
        const aggregate = StorageAggregate.reconstitute({
          id: STORAGE_ID,
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          warehouses: [buildWarehouse(warehouseUUID, 'WH-A')],
          storeRooms: [],
          customRooms: [],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-06-01'),
        });

        const view = aggregate.findItemView(warehouseUUID);
        expect(view?.uuid).toBe(warehouseUUID);
        expect(view?.type).toBe(StorageType.WAREHOUSE);
      });
    });

    describe('When findItemView(uuid) is called for a missing child', () => {
      it('Then it returns null', () => {
        const aggregate = StorageAggregate.reconstitute({
          id: STORAGE_ID,
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          warehouses: [],
          storeRooms: [],
          customRooms: [],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-06-01'),
        });

        expect(aggregate.findItemView('non-existent-uuid')).toBeNull();
      });
    });
  });

  describe('Given a populated StorageAggregate', () => {
    describe('When findWarehouse / findStoreRoom / findCustomRoom are called', () => {
      it('Then they return the matching aggregate or null', () => {
        const wUUID = '019538a0-0000-7000-8000-00000000aaaa';
        const sUUID = '019538a0-0000-7000-8000-00000000bbbb';
        const cUUID = '019538a0-0000-7000-8000-00000000cccc';

        const aggregate = StorageAggregate.reconstitute({
          id: STORAGE_ID,
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          warehouses: [buildWarehouse(wUUID)],
          storeRooms: [buildStoreRoom(sUUID)],
          customRooms: [buildCustomRoom(cUUID)],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-06-01'),
        });

        expect(aggregate.findWarehouse(wUUID)?.uuid).toBe(wUUID);
        expect(aggregate.findStoreRoom(sUUID)?.uuid).toBe(sUUID);
        expect(aggregate.findCustomRoom(cUUID)?.uuid).toBe(cUUID);

        expect(aggregate.findWarehouse('missing')).toBeNull();
        expect(aggregate.findStoreRoom('missing')).toBeNull();
        expect(aggregate.findCustomRoom('missing')).toBeNull();
      });
    });
  });
});
