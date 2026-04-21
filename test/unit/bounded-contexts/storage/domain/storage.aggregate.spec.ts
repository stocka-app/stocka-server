import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageCreatedEvent } from '@storage/domain/events/storage-created.event';
import { StorageFrozenEvent } from '@storage/domain/events/storage-frozen.event';
import { StorageReactivatedEvent } from '@storage/domain/events/storage-reactivated.event';
import { StorageNameChangedEvent } from '@storage/domain/events/storage-name-changed.event';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000099';
const WH_UUID = '019538a0-0000-7000-8000-000000000010';
const SR_UUID = '019538a0-0000-7000-8000-000000000020';
const CR_UUID = '019538a0-0000-7000-8000-000000000030';

function makeWarehouse(
  uuid: string = WH_UUID,
  overrides: Partial<{ archivedAt: Date | null; frozenAt: Date | null }> = {},
): WarehouseModel {
  return WarehouseModel.reconstitute({
    id: 1,
    uuid: new UUIDVO(uuid),
    tenantUUID: new UUIDVO(TENANT_UUID),
    name: new StorageNameVO('Central Warehouse'),
    description: new StorageDescriptionVO('Main warehouse'),
    icon: new StorageIconVO('warehouse'),
    color: new StorageColorVO('#3b82f6'),
    address: new StorageAddressVO('789 Industrial Blvd'),
    archivedAt: overrides.archivedAt ?? null,
    frozenAt: overrides.frozenAt ?? null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  });
}

function makeStoreRoom(
  uuid: string = SR_UUID,
  overrides: Partial<{ archivedAt: Date | null; frozenAt: Date | null }> = {},
): StoreRoomModel {
  return StoreRoomModel.reconstitute({
    id: 2,
    uuid: new UUIDVO(uuid),
    tenantUUID: new UUIDVO(TENANT_UUID),
    name: new StorageNameVO('Main Bodega'),
    description: null,
    icon: new StorageIconVO('inventory_2'),
    color: new StorageColorVO('#d97706'),
    address: new StorageAddressVO('456 Oak Ave'),
    archivedAt: overrides.archivedAt ?? null,
    frozenAt: overrides.frozenAt ?? null,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  });
}

function makeCustomRoom(
  uuid: string = CR_UUID,
  overrides: Partial<{ archivedAt: Date | null; frozenAt: Date | null }> = {},
): CustomRoomModel {
  return CustomRoomModel.reconstitute({
    id: 3,
    uuid: new UUIDVO(uuid),
    tenantUUID: new UUIDVO(TENANT_UUID),
    name: StorageNameVO.create('Office Room'),
    description: StorageDescriptionVO.create('Main office space'),
    icon: StorageIconVO.create('other_houses'),
    color: StorageColorVO.create('#6b7280'),
    roomType: RoomTypeNameVO.create('Office'),
    address: StorageAddressVO.create('123 Main St'),
    archivedAt: overrides.archivedAt ?? null,
    frozenAt: overrides.frozenAt ?? null,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  });
}

function makeEmptyAggregate(): StorageAggregate {
  return StorageAggregate.create({ tenantUUID: TENANT_UUID });
}

function makePopulatedAggregate(): StorageAggregate {
  return StorageAggregate.reconstitute({
    id: 42,
    uuid: '019538a0-0000-7000-8000-000000000099',
    tenantUUID: TENANT_UUID,
    warehouses: [makeWarehouse()],
    storeRooms: [makeStoreRoom()],
    customRooms: [makeCustomRoom()],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  });
}

// ── StorageAggregate.create() ──────────────────────────────────────────────────

describe('StorageAggregate — create()', () => {
  describe('Given a tenant UUID', () => {
    describe('When a new empty aggregate is created', () => {
      it('Then it has the tenant UUID and empty collections', () => {
        const aggregate = makeEmptyAggregate();

        expect(aggregate.tenantUUID.toString()).toBe(TENANT_UUID);
        expect(aggregate.warehouses).toHaveLength(0);
        expect(aggregate.storeRooms).toHaveLength(0);
        expect(aggregate.customRooms).toHaveLength(0);
      });

      it('Then a UUID is auto-generated', () => {
        const aggregate = makeEmptyAggregate();
        expect(aggregate.uuid).toBeDefined();
        expect(aggregate.uuid.length).toBeGreaterThan(0);
      });
    });
  });
});

// ── StorageAggregate.reconstitute() ────────────────────────────────────────────

describe('StorageAggregate — reconstitute()', () => {
  describe('Given persisted storage data with all three collection types', () => {
    describe('When reconstitute is called', () => {
      it('Then all properties and collections are restored', () => {
        const aggregate = makePopulatedAggregate();

        expect(aggregate.id).toBe(42);
        expect(aggregate.uuid).toBe('019538a0-0000-7000-8000-000000000099');
        expect(aggregate.tenantUUID.toString()).toBe(TENANT_UUID);
        expect(aggregate.warehouses).toHaveLength(1);
        expect(aggregate.storeRooms).toHaveLength(1);
        expect(aggregate.customRooms).toHaveLength(1);
        expect(aggregate.createdAt).toEqual(new Date('2024-01-01'));
        expect(aggregate.updatedAt).toEqual(new Date('2024-01-01'));
      });
    });
  });

  describe('Given persisted storage data with empty collections', () => {
    describe('When reconstitute is called', () => {
      it('Then collections are empty', () => {
        const aggregate = StorageAggregate.reconstitute({
          id: 1,
          uuid: '019538a0-0000-7000-8000-000000000001',
          tenantUUID: TENANT_UUID,
          warehouses: [],
          storeRooms: [],
          customRooms: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        expect(aggregate.warehouses).toHaveLength(0);
        expect(aggregate.storeRooms).toHaveLength(0);
        expect(aggregate.customRooms).toHaveLength(0);
      });
    });
  });
});

// ── addWarehouse / addStoreRoom / addCustomRoom ────────────────────────────────

describe('StorageAggregate — add items', () => {
  describe('Given an empty aggregate', () => {
    describe('When a warehouse is added', () => {
      let aggregate: StorageAggregate;
      let warehouse: WarehouseModel;

      beforeEach(() => {
        aggregate = makeEmptyAggregate();
        warehouse = WarehouseModel.create({
          uuid: WH_UUID,
          tenantUUID: TENANT_UUID,
          name: 'New Warehouse',
          icon: 'warehouse',
          color: '#3b82f6',
          address: '100 Industrial Ave',
        });
        aggregate.addWarehouse(warehouse, ACTOR_UUID);
      });

      it('Then the warehouse appears in the collection', () => {
        expect(aggregate.warehouses).toHaveLength(1);
        expect(aggregate.warehouses[0].uuid.toString()).toBe(WH_UUID);
      });

      it('Then a StorageCreatedEvent is emitted with the model UUID and actorUUID', () => {
        const events = aggregate.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(StorageCreatedEvent);
        const event = events[0] as StorageCreatedEvent;
        expect(event.storageUUID).toBe(WH_UUID);
        expect(event.tenantUUID).toBe(TENANT_UUID);
        expect(event.actorUUID).toBe(ACTOR_UUID);
        expect(event.type).toBe(StorageType.WAREHOUSE);
        expect(event.name).toBe('New Warehouse');
      });
    });

    describe('When a store room is added', () => {
      let aggregate: StorageAggregate;
      let storeRoom: StoreRoomModel;

      beforeEach(() => {
        aggregate = makeEmptyAggregate();
        storeRoom = StoreRoomModel.create({
          uuid: SR_UUID,
          tenantUUID: TENANT_UUID,
          name: 'New Bodega',
          icon: 'inventory_2',
          color: '#d97706',
          address: '200 Storage St',
        });
        aggregate.addStoreRoom(storeRoom, ACTOR_UUID);
      });

      it('Then the store room appears in the collection', () => {
        expect(aggregate.storeRooms).toHaveLength(1);
        expect(aggregate.storeRooms[0].uuid.toString()).toBe(SR_UUID);
      });

      it('Then a StorageCreatedEvent is emitted with STORE_ROOM type', () => {
        const events = aggregate.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(StorageCreatedEvent);
        const event = events[0] as StorageCreatedEvent;
        expect(event.storageUUID).toBe(SR_UUID);
        expect(event.type).toBe(StorageType.STORE_ROOM);
      });
    });

    describe('When a custom room is added', () => {
      let aggregate: StorageAggregate;
      let customRoom: CustomRoomModel;

      beforeEach(() => {
        aggregate = makeEmptyAggregate();
        customRoom = CustomRoomModel.create({
          uuid: CR_UUID,
          tenantUUID: TENANT_UUID,
          name: 'New Office',
          roomType: 'Office',
          icon: 'other_houses',
          color: '#6b7280',
          address: '300 Custom Lane',
        });
        aggregate.addCustomRoom(customRoom, ACTOR_UUID);
      });

      it('Then the custom room appears in the collection', () => {
        expect(aggregate.customRooms).toHaveLength(1);
        expect(aggregate.customRooms[0].uuid.toString()).toBe(CR_UUID);
      });

      it('Then a StorageCreatedEvent is emitted with CUSTOM_ROOM type', () => {
        const events = aggregate.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(StorageCreatedEvent);
        const event = events[0] as StorageCreatedEvent;
        expect(event.storageUUID).toBe(CR_UUID);
        expect(event.type).toBe(StorageType.CUSTOM_ROOM);
        expect(event.name).toBe('New Office');
      });
    });
  });
});

// ── findWarehouse / findStoreRoom / findCustomRoom ─────────────────────────────

describe('StorageAggregate — find items', () => {
  let aggregate: StorageAggregate;

  beforeEach(() => {
    aggregate = makePopulatedAggregate();
  });

  describe('Given a populated aggregate', () => {
    describe('When findWarehouse is called with a valid UUID', () => {
      it('Then it returns the warehouse model', () => {
        const found = aggregate.findWarehouse(WH_UUID);
        expect(found).not.toBeNull();
        expect(found!.uuid.toString()).toBe(WH_UUID);
      });
    });

    describe('When findWarehouse is called with a non-existent UUID', () => {
      it('Then it returns null', () => {
        expect(aggregate.findWarehouse('019538a0-0000-7000-8000-999999999999')).toBeNull();
      });
    });

    describe('When findStoreRoom is called with a valid UUID', () => {
      it('Then it returns the store room model', () => {
        const found = aggregate.findStoreRoom(SR_UUID);
        expect(found).not.toBeNull();
        expect(found!.uuid.toString()).toBe(SR_UUID);
      });
    });

    describe('When findStoreRoom is called with a non-existent UUID', () => {
      it('Then it returns null', () => {
        expect(aggregate.findStoreRoom('019538a0-0000-7000-8000-999999999999')).toBeNull();
      });
    });

    describe('When findCustomRoom is called with a valid UUID', () => {
      it('Then it returns the custom room model', () => {
        const found = aggregate.findCustomRoom(CR_UUID);
        expect(found).not.toBeNull();
        expect(found!.uuid.toString()).toBe(CR_UUID);
      });
    });

    describe('When findCustomRoom is called with a non-existent UUID', () => {
      it('Then it returns null', () => {
        expect(aggregate.findCustomRoom('019538a0-0000-7000-8000-999999999999')).toBeNull();
      });
    });
  });
});

// ── update items ──────────────────────────────────────────────────────────────
// H-07 DT-H07-4: updateX methods removed from StorageAggregate. Update flows
// run through per-type handlers (UpdateWarehouseHandler, UpdateStoreRoomHandler,
// UpdateCustomRoomHandler) using StorageUpdateEventsPublisher. New unit tests
// live in FASE 5 (Paso 9 — STOC-373).

// ── archive items ──────────────────────────────────────────────────────────────
// H-07: archiveX methods removed from StorageAggregate. Archive flows run through
// per-type handlers (ArchiveWarehouseHandler, ArchiveStoreRoomHandler,
// ArchiveCustomRoomHandler). New unit tests live in FASE 5 (Paso 9 — STOC-373).

// ── findItemView / listItemViews ───────────────────────────────────────────────

describe('StorageAggregate — view methods', () => {
  describe('Given a populated aggregate with one warehouse, one store room, and one custom room', () => {
    let aggregate: StorageAggregate;

    beforeEach(() => {
      aggregate = makePopulatedAggregate();
    });

    describe('When listItemViews is called', () => {
      it('Then it returns views for all three items', () => {
        const views = aggregate.listItemViews();
        expect(views).toHaveLength(3);

        const types = views.map((v) => v.type);
        expect(types).toContain(StorageType.WAREHOUSE);
        expect(types).toContain(StorageType.STORE_ROOM);
        expect(types).toContain(StorageType.CUSTOM_ROOM);
      });

      it('Then each view contains all expected fields', () => {
        const views = aggregate.listItemViews();
        const whView = views.find((v) => v.type === StorageType.WAREHOUSE)!;

        expect(whView.uuid).toBe(WH_UUID);
        expect(whView.name).toBe('Central Warehouse');
        expect(whView.description).toBe('Main warehouse');
        expect(whView.icon).toBe('warehouse');
        expect(whView.color).toBe('#3b82f6');
        expect(whView.address).toBe('789 Industrial Blvd');
        expect(whView.archivedAt).toBeNull();
        expect(whView.frozenAt).toBeNull();
        expect(whView.status).toBe(StorageStatus.ACTIVE);
        expect(whView.createdAt).toBeInstanceOf(Date);
        expect(whView.updatedAt).toBeInstanceOf(Date);
        expect(whView.roomType).toBeNull();
      });

      it('Then the custom room view includes roomType', () => {
        const views = aggregate.listItemViews();
        const crView = views.find((v) => v.type === StorageType.CUSTOM_ROOM)!;

        expect(crView.roomType).toBe('Office');
      });

      it('Then store rooms and custom rooms without an address surface address as null', () => {
        const noAddrSR = StoreRoomModel.reconstitute({
          id: 4,
          uuid: new UUIDVO('019538a0-0000-7000-8000-000000000004'),
          tenantUUID: new UUIDVO(TENANT_UUID),
          name: new StorageNameVO('Bodega Sin Dirección'),
          description: null,
          icon: new StorageIconVO('inventory_2'),
          color: new StorageColorVO('#d97706'),
          address: null,
          archivedAt: null,
          frozenAt: null,
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-02-01'),
        });
        const noAddrCR = CustomRoomModel.reconstitute({
          id: 5,
          uuid: new UUIDVO('019538a0-0000-7000-8000-000000000005'),
          tenantUUID: new UUIDVO(TENANT_UUID),
          name: StorageNameVO.create('Cuarto Sin Dirección'),
          description: null,
          icon: StorageIconVO.create('other_houses'),
          color: StorageColorVO.create('#6b7280'),
          roomType: RoomTypeNameVO.create('Office'),
          address: null,
          archivedAt: null,
          frozenAt: null,
          createdAt: new Date('2024-03-01'),
          updatedAt: new Date('2024-03-01'),
        });
        const aggWithoutAddresses = StorageAggregate.reconstitute({
          id: 99,
          uuid: '019538a0-0000-7000-8000-000000000099',
          tenantUUID: TENANT_UUID,
          warehouses: [],
          storeRooms: [noAddrSR],
          customRooms: [noAddrCR],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        });

        const views = aggWithoutAddresses.listItemViews();
        const srView = views.find((v) => v.type === StorageType.STORE_ROOM)!;
        const crView = views.find((v) => v.type === StorageType.CUSTOM_ROOM)!;
        expect(srView.address).toBeNull();
        expect(crView.address).toBeNull();
      });
    });

    describe('When findItemView is called with a valid warehouse UUID', () => {
      it('Then it returns the warehouse view', () => {
        const view = aggregate.findItemView(WH_UUID);
        expect(view).not.toBeNull();
        expect(view!.uuid).toBe(WH_UUID);
        expect(view!.type).toBe(StorageType.WAREHOUSE);
      });
    });

    describe('When findItemView is called with a valid store room UUID', () => {
      it('Then it returns the store room view', () => {
        const view = aggregate.findItemView(SR_UUID);
        expect(view).not.toBeNull();
        expect(view!.uuid).toBe(SR_UUID);
        expect(view!.type).toBe(StorageType.STORE_ROOM);
      });
    });

    describe('When findItemView is called with a valid custom room UUID', () => {
      it('Then it returns the custom room view', () => {
        const view = aggregate.findItemView(CR_UUID);
        expect(view).not.toBeNull();
        expect(view!.uuid).toBe(CR_UUID);
        expect(view!.type).toBe(StorageType.CUSTOM_ROOM);
      });
    });

    describe('When findItemView is called with a non-existent UUID', () => {
      it('Then it returns null', () => {
        expect(aggregate.findItemView('019538a0-0000-7000-8000-999999999999')).toBeNull();
      });
    });
  });

  describe('Given a populated aggregate with an archived warehouse', () => {
    describe('When listItemViews is called', () => {
      it('Then the archived warehouse view has status ARCHIVED', () => {
        const archivedWH = makeWarehouse(WH_UUID, { archivedAt: new Date() });
        const aggregate = StorageAggregate.reconstitute({
          id: 1,
          uuid: '019538a0-0000-7000-8000-000000000001',
          tenantUUID: TENANT_UUID,
          warehouses: [archivedWH],
          storeRooms: [],
          customRooms: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const views = aggregate.listItemViews();
        expect(views).toHaveLength(1);
        expect(views[0].status).toBe(StorageStatus.ARCHIVED);
        expect(views[0].archivedAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Given a populated aggregate with a frozen store room', () => {
    describe('When listItemViews is called', () => {
      it('Then the frozen store room view has status FROZEN', () => {
        const frozenSR = makeStoreRoom(SR_UUID, { frozenAt: new Date() });
        const aggregate = StorageAggregate.reconstitute({
          id: 1,
          uuid: '019538a0-0000-7000-8000-000000000001',
          tenantUUID: TENANT_UUID,
          warehouses: [],
          storeRooms: [frozenSR],
          customRooms: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const views = aggregate.listItemViews();
        expect(views).toHaveLength(1);
        expect(views[0].status).toBe(StorageStatus.FROZEN);
        expect(views[0].frozenAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Given an empty aggregate', () => {
    describe('When listItemViews is called', () => {
      it('Then it returns an empty array', () => {
        const aggregate = makeEmptyAggregate();
        expect(aggregate.listItemViews()).toHaveLength(0);
      });
    });
  });
});

// ── Getters ────────────────────────────────────────────────────────────────────

describe('StorageAggregate — getters', () => {
  describe('Given a reconstituted aggregate', () => {
    describe('When getters are called', () => {
      it('Then tenantUUID returns the tenant UUID', () => {
        const aggregate = makePopulatedAggregate();
        expect(aggregate.tenantUUID.toString()).toBe(TENANT_UUID);
      });

      it('Then warehouses, storeRooms, customRooms return readonly arrays', () => {
        const aggregate = makePopulatedAggregate();
        expect(aggregate.warehouses).toHaveLength(1);
        expect(aggregate.storeRooms).toHaveLength(1);
        expect(aggregate.customRooms).toHaveLength(1);
      });
    });
  });
});
