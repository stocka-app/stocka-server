import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StoreRoomAggregate } from '@storage/domain/aggregates/store-room.aggregate';
import { WarehouseAggregate } from '@storage/domain/aggregates/warehouse.aggregate';
import { CustomRoomEntity } from '@storage/infrastructure/entities/custom-room.entity';
import { StorageEntity } from '@storage/infrastructure/entities/storage.entity';
import { StoreRoomEntity } from '@storage/infrastructure/entities/store-room.entity';
import { WarehouseEntity } from '@storage/infrastructure/entities/warehouse.entity';
import { CustomRoomMapper } from '@storage/infrastructure/mappers/custom-room.mapper';
import { StorageMapper } from '@storage/infrastructure/mappers/storage.mapper';
import { StoreRoomMapper } from '@storage/infrastructure/mappers/store-room.mapper';
import { WarehouseMapper } from '@storage/infrastructure/mappers/warehouse.mapper';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000099';
const STORAGE_UUID = '019538a0-0000-7000-8000-000000000010';
const STORAGE_PARENT_UUID = '019538a0-0000-7000-8000-0000000000ff';

const NOW = new Date('2024-06-01T00:00:00.000Z');
const CREATED_AT = new Date('2024-01-01T00:00:00.000Z');

function buildWarehouseEntity(overrides: Partial<WarehouseEntity> = {}): WarehouseEntity {
  const entity = new WarehouseEntity();
  Object.assign(entity, {
    id: 1,
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    storageId: 17,
    name: 'WH',
    description: null,
    address: 'addr',
    icon: 'icon',
    color: '#000000',
    frozenAt: null,
    archivedAt: null,
    createdAt: CREATED_AT,
    updatedAt: NOW,
    ...overrides,
  });
  return entity;
}

function buildStoreRoomEntity(overrides: Partial<StoreRoomEntity> = {}): StoreRoomEntity {
  const entity = new StoreRoomEntity();
  Object.assign(entity, {
    id: 2,
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    storageId: 17,
    name: 'SR',
    description: null,
    address: null,
    icon: 'icon',
    color: '#000000',
    frozenAt: null,
    archivedAt: null,
    createdAt: CREATED_AT,
    updatedAt: NOW,
    ...overrides,
  });
  return entity;
}

function buildCustomRoomEntity(overrides: Partial<CustomRoomEntity> = {}): CustomRoomEntity {
  const entity = new CustomRoomEntity();
  Object.assign(entity, {
    id: 3,
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    storageId: 17,
    name: 'CR',
    description: null,
    roomType: 'Office',
    address: null,
    icon: 'icon',
    color: '#000000',
    frozenAt: null,
    archivedAt: null,
    createdAt: CREATED_AT,
    updatedAt: NOW,
    ...overrides,
  });
  return entity;
}

// ─── WarehouseMapper ──────────────────────────────────────────────────────────

describe('WarehouseMapper', () => {
  describe('toDomain', () => {
    describe('Given a persisted Warehouse entity with description and timestamps', () => {
      it('Then it reconstitutes the WarehouseAggregate with all fields populated', () => {
        const entity = buildWarehouseEntity({
          description: 'main location',
          frozenAt: new Date('2024-05-01T00:00:00.000Z'),
        });

        const aggregate = WarehouseMapper.toDomain(entity);

        expect(aggregate.uuid).toBe(STORAGE_UUID);
        expect(aggregate.tenantUUID.toString()).toBe(TENANT_UUID);
        expect(aggregate.name.getValue()).toBe('WH');
        expect(aggregate.description?.getValue()).toBe('main location');
        expect(aggregate.address.getValue()).toBe('addr');
        expect(aggregate.frozenAt).toEqual(new Date('2024-05-01T00:00:00.000Z'));
        expect(aggregate.archivedAt).toBeNull();
        expect(aggregate.createdAt).toEqual(CREATED_AT);
        expect(aggregate.updatedAt).toEqual(NOW);
      });
    });

    describe('Given a persisted Warehouse entity with no description', () => {
      it('Then it reconstitutes with description set to null', () => {
        const aggregate = WarehouseMapper.toDomain(buildWarehouseEntity({ description: null }));
        expect(aggregate.description).toBeNull();
      });
    });
  });

  describe('toEntity', () => {
    describe('Given a Warehouse aggregate without a storageId override', () => {
      it('Then it serializes all VOs back to primitive entity props (no storageId set)', () => {
        const aggregate = WarehouseAggregate.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'WH',
          icon: 'icon',
          color: '#000000',
          address: 'addr',
        });

        const entity = WarehouseMapper.toEntity(aggregate);

        expect(entity.uuid).toBe(STORAGE_UUID);
        expect(entity.name).toBe('WH');
        expect(entity.address).toBe('addr');
        expect(entity.frozenAt).toBeNull();
        expect(entity.archivedAt).toBeNull();
        expect(entity.storageId).toBeUndefined();
      });
    });

    describe('Given a Warehouse aggregate with a storageId override', () => {
      it('Then it includes storageId in the entity output', () => {
        const aggregate = WarehouseAggregate.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'WH',
          icon: 'icon',
          color: '#000000',
          address: 'addr',
          description: 'description text',
        });

        const entity = WarehouseMapper.toEntity(aggregate, 42);

        expect(entity.storageId).toBe(42);
        expect(entity.description).toBe('description text');
      });
    });
  });
});

// ─── StoreRoomMapper ──────────────────────────────────────────────────────────

describe('StoreRoomMapper', () => {
  describe('toDomain', () => {
    describe('Given a persisted StoreRoom entity with an address', () => {
      it('Then it reconstitutes the StoreRoomAggregate populating the address VO', () => {
        const entity = buildStoreRoomEntity({ address: 'shop-floor' });

        const aggregate = StoreRoomMapper.toDomain(entity);

        expect(aggregate.uuid).toBe(STORAGE_UUID);
        expect(aggregate.address?.getValue()).toBe('shop-floor');
      });
    });

    describe('Given a persisted StoreRoom entity without an address', () => {
      it('Then the aggregate exposes a null address', () => {
        const aggregate = StoreRoomMapper.toDomain(buildStoreRoomEntity({ address: null }));
        expect(aggregate.address).toBeNull();
      });
    });

    describe('Given a persisted StoreRoom entity with a description', () => {
      it('Then the aggregate exposes the description VO', () => {
        const aggregate = StoreRoomMapper.toDomain(
          buildStoreRoomEntity({ description: 'Stockroom for sales floor' }),
        );
        expect(aggregate.description?.getValue()).toBe('Stockroom for sales floor');
      });
    });
  });

  describe('toEntity', () => {
    describe('Given a StoreRoom aggregate with a storageId override', () => {
      it('Then it serializes back including the storageId', () => {
        const aggregate = StoreRoomAggregate.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'SR',
          icon: 'icon',
          color: '#000000',
        });

        const entity = StoreRoomMapper.toEntity(aggregate, 42);

        expect(entity.uuid).toBe(STORAGE_UUID);
        expect(entity.storageId).toBe(42);
        expect(entity.address).toBeNull();
      });
    });

    describe('Given a StoreRoom aggregate without storageId', () => {
      it('Then storageId is omitted from the entity', () => {
        const aggregate = StoreRoomAggregate.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'SR',
          icon: 'icon',
          color: '#000000',
        });

        const entity = StoreRoomMapper.toEntity(aggregate);
        expect(entity.storageId).toBeUndefined();
      });
    });
  });
});

// ─── CustomRoomMapper ─────────────────────────────────────────────────────────

describe('CustomRoomMapper', () => {
  describe('toDomain', () => {
    describe('Given a persisted CustomRoom entity', () => {
      it('Then it reconstitutes the CustomRoomAggregate including roomType and address', () => {
        const entity = buildCustomRoomEntity({
          roomType: 'Server Closet',
          address: 'IT-Room',
          description: 'air-conditioned',
        });

        const aggregate = CustomRoomMapper.toDomain(entity);

        expect(aggregate.roomType.getValue()).toBe('Server Closet');
        expect(aggregate.address?.getValue()).toBe('IT-Room');
        expect(aggregate.description?.getValue()).toBe('air-conditioned');
      });
    });

    describe('Given a persisted CustomRoom entity with no address or description', () => {
      it('Then the aggregate exposes null address and description', () => {
        const aggregate = CustomRoomMapper.toDomain(buildCustomRoomEntity());
        expect(aggregate.address).toBeNull();
        expect(aggregate.description).toBeNull();
      });
    });
  });

  describe('toEntity', () => {
    describe('Given a CustomRoom aggregate without a storageId', () => {
      it('Then it serializes back without storageId', () => {
        const aggregate = CustomRoomAggregate.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'CR',
          icon: 'icon',
          color: '#000000',
          roomType: 'Office',
        });

        const entity = CustomRoomMapper.toEntity(aggregate);
        expect(entity.uuid).toBe(STORAGE_UUID);
        expect(entity.roomType).toBe('Office');
        expect(entity.storageId).toBeUndefined();
      });
    });

    describe('Given a CustomRoom aggregate with a storageId override', () => {
      it('Then it serializes back with the storageId', () => {
        const aggregate = CustomRoomAggregate.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'CR',
          icon: 'icon',
          color: '#000000',
          roomType: 'Office',
          address: 'somewhere',
        });

        const entity = CustomRoomMapper.toEntity(aggregate, 99);
        expect(entity.storageId).toBe(99);
        expect(entity.address).toBe('somewhere');
      });
    });
  });
});

// ─── StorageMapper ────────────────────────────────────────────────────────────

describe('StorageMapper', () => {
  describe('Given a persisted StorageEntity with empty children', () => {
    describe('When toDomain is called', () => {
      it('Then it builds an empty StorageAggregate scoped to the tenant', () => {
        const entity = new StorageEntity();
        Object.assign(entity, {
          id: 17,
          uuid: STORAGE_PARENT_UUID,
          tenantUUID: TENANT_UUID,
          createdAt: CREATED_AT,
          updatedAt: NOW,
        });

        const aggregate = StorageMapper.toDomain(entity, [], [], []);

        expect(aggregate.tenantUUID.toString()).toBe(TENANT_UUID);
        expect(aggregate.warehouses).toHaveLength(0);
        expect(aggregate.storeRooms).toHaveLength(0);
        expect(aggregate.customRooms).toHaveLength(0);
      });
    });
  });

  describe('Given a persisted StorageEntity with children of all types', () => {
    describe('When toDomain is called', () => {
      it('Then it produces a StorageAggregate that exposes one item view per child', () => {
        const entity = new StorageEntity();
        Object.assign(entity, {
          id: 17,
          uuid: STORAGE_PARENT_UUID,
          tenantUUID: TENANT_UUID,
          createdAt: CREATED_AT,
          updatedAt: NOW,
        });

        const warehouse = WarehouseAggregate.create({
          uuid: '019538a0-0000-7000-8000-00000000aaaa',
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'WH-A',
          icon: 'icon',
          color: '#000000',
          address: 'addr',
        });

        const storeRoom = StoreRoomAggregate.create({
          uuid: '019538a0-0000-7000-8000-00000000bbbb',
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'SR-A',
          icon: 'icon',
          color: '#000000',
        });

        const customRoom = CustomRoomAggregate.create({
          uuid: '019538a0-0000-7000-8000-00000000cccc',
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'CR-A',
          icon: 'icon',
          color: '#000000',
          roomType: 'Office',
        });

        const aggregate = StorageMapper.toDomain(entity, [warehouse], [storeRoom], [customRoom]);

        expect(aggregate.warehouses).toHaveLength(1);
        expect(aggregate.storeRooms).toHaveLength(1);
        expect(aggregate.customRooms).toHaveLength(1);
        expect(aggregate.listItemViews()).toHaveLength(3);
      });
    });
  });
});
