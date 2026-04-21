import { StorageMapper } from '@storage/infrastructure/mappers/storage.mapper';
import { CustomRoomMapper } from '@storage/infrastructure/mappers/custom-room.mapper';
import { StoreRoomMapper } from '@storage/infrastructure/mappers/store-room.mapper';
import { WarehouseMapper } from '@storage/infrastructure/mappers/warehouse.mapper';
import { StorageActivityLogMapper } from '@storage/infrastructure/mappers/storage-activity-log.mapper';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageActivityAction } from '@storage/domain/enums/storage-activity-action.enum';
import { StorageActivityLogEntry } from '@storage/domain/models/storage-activity-log-entry.model';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StorageEntity } from '@storage/infrastructure/entities/storage.entity';
import { CustomRoomEntity } from '@storage/infrastructure/entities/custom-room.entity';
import { StoreRoomEntity } from '@storage/infrastructure/entities/store-room.entity';
import { WarehouseEntity } from '@storage/infrastructure/entities/warehouse.entity';
import { StorageActivityLogEntity } from '@storage/infrastructure/entities/storage-activity-log.entity';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';

// ── CustomRoomMapper ────────────────────────────────────────────────────────────

describe('CustomRoomMapper', () => {
  describe('Given a CustomRoomEntity with all fields set', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a CustomRoomModel with all fields mapped', () => {
        const entity = {
          id: 1,
          uuid: '019538a0-0000-7000-8000-000000000010',
          tenantUUID: TENANT_UUID,
          storageId: 1,
          name: 'Office Room',
          description: 'Main office space',
          icon: 'office-icon',
          color: '#AABBCC',
          roomType: 'Office',
          address: '123 Main St',
          frozenAt: null,
          archivedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        } as CustomRoomEntity;

        const model = CustomRoomMapper.toDomain(entity);
        expect(model.uuid.toString()).toBe('019538a0-0000-7000-8000-000000000010');
        expect(model.tenantUUID).toBe(TENANT_UUID);
        expect(model.name.getValue()).toBe('Office Room');
        expect(model.description?.getValue()).toBe('Main office space');
        expect(model.icon.getValue()).toBe('office-icon');
        expect(model.color.getValue()).toBe('#AABBCC');
        expect(model.roomType.getValue()).toBe('Office');
        expect(model.address!.getValue()).toBe('123 Main St');
        expect(model.frozenAt).toBeNull();
        expect(model.archivedAt).toBeNull();
        expect(model.createdAt).toEqual(new Date('2024-01-01'));
      });

      it('Then description is null when not set on entity', () => {
        const entity = {
          id: 2,
          uuid: '019538a0-0000-7000-8000-000000000019',
          tenantUUID: TENANT_UUID,
          storageId: 2,
          name: 'No Desc Room',
          description: null,
          icon: 'icon-1',
          color: '#AABBCC',
          roomType: 'Storage',
          address: '456 Ave',
          frozenAt: null,
          archivedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        } as unknown as CustomRoomEntity;

        const model = CustomRoomMapper.toDomain(entity);
        expect(model.description).toBeNull();
      });

      it('Then address is null when the entity has no address', () => {
        const entity = {
          id: 4,
          uuid: '019538a0-0000-7000-8000-000000000041',
          tenantUUID: TENANT_UUID,
          storageId: 4,
          name: 'No Addr Room',
          description: null,
          icon: 'icon-1',
          color: '#AABBCC',
          roomType: 'Office',
          address: null,
          frozenAt: null,
          archivedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        } as unknown as CustomRoomEntity;

        const model = CustomRoomMapper.toDomain(entity);
        expect(model.address).toBeNull();
      });
    });
  });

  describe('Given a CustomRoomModel created via create()', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a partial entity with all business fields', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000050',
          tenantUUID: TENANT_UUID,
          name: 'Test Room',
          description: 'A test room',
          icon: 'test-icon',
          color: '#112233',
          roomType: 'Kitchen',
          address: '456 Oak Ave',
        });

        const entity = CustomRoomMapper.toEntity(model);
        expect(entity.uuid).toBeDefined();
        expect(entity.tenantUUID).toBe(TENANT_UUID);
        expect(entity.name).toBe('Test Room');
        expect(entity.description).toBe('A test room');
        expect(entity.icon).toBe('test-icon');
        expect(entity.color).toBe('#112233');
        expect(entity.roomType).toBe('Kitchen');
        expect(entity.address).toBe('456 Oak Ave');
        expect(entity.frozenAt).toBeNull();
        expect(entity.archivedAt).toBeNull();
      });

      it('Then description is null when model has no description', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000051',
          tenantUUID: TENANT_UUID,
          name: 'No Desc Room',
          roomType: 'Storage',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '789 Elm St',
        });

        const entity = CustomRoomMapper.toEntity(model);
        expect(entity.description).toBeNull();
      });

      it('Then storageId is set when provided', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000052',
          tenantUUID: TENANT_UUID,
          name: 'With Storage Id',
          roomType: 'Office',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '100 St',
        });

        const entity = CustomRoomMapper.toEntity(model, 42);
        expect(entity.storageId).toBe(42);
      });

      it('Then address is null when the model has no address', () => {
        const model = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000053',
          tenantUUID: TENANT_UUID,
          name: 'No Addr Room',
          roomType: 'Office',
          icon: 'icon-1',
          color: '#AABBCC',
        });

        const entity = CustomRoomMapper.toEntity(model);
        expect(entity.address).toBeNull();
      });
    });
  });
});

// ── StoreRoomMapper ─────────────────────────────────────────────────────────────

describe('StoreRoomMapper', () => {
  describe('Given a StoreRoomEntity with all fields set', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a StoreRoomModel with all fields mapped', () => {
        const entity = {
          id: 2,
          uuid: '019538a0-0000-7000-8000-000000000020',
          tenantUUID: TENANT_UUID,
          storageId: 2,
          name: 'Main Bodega',
          description: 'Primary storage',
          icon: 'store-icon',
          color: '#334455',
          address: '789 Elm Rd',
          frozenAt: null,
          archivedAt: null,
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-02-02'),
        } as StoreRoomEntity;

        const model = StoreRoomMapper.toDomain(entity);
        expect(model.uuid.toString()).toBe('019538a0-0000-7000-8000-000000000020');
        expect(model.tenantUUID).toBe(TENANT_UUID);
        expect(model.name.getValue()).toBe('Main Bodega');
        expect(model.description?.getValue()).toBe('Primary storage');
        expect(model.icon.getValue()).toBe('store-icon');
        expect(model.color.getValue()).toBe('#334455');
        expect(model.address!.getValue()).toBe('789 Elm Rd');
        expect(model.frozenAt).toBeNull();
        expect(model.archivedAt).toBeNull();
      });

      it('Then description is null when not set on entity', () => {
        const entity = {
          id: 3,
          uuid: '019538a0-0000-7000-8000-000000000029',
          tenantUUID: TENANT_UUID,
          storageId: 3,
          name: 'No Desc Store',
          description: null,
          icon: 'icon-1',
          color: '#AABBCC',
          address: '100 St',
          frozenAt: null,
          archivedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        } as unknown as StoreRoomEntity;

        const model = StoreRoomMapper.toDomain(entity);
        expect(model.description).toBeNull();
      });
    });
  });

  describe('Given a StoreRoomModel created via create()', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a partial entity with all business fields', () => {
        const model = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000060',
          tenantUUID: TENANT_UUID,
          name: 'Bodega Test',
          description: 'Test bodega',
          icon: 'bodega-icon',
          color: '#AABBCC',
          address: '100 Industrial',
        });

        const entity = StoreRoomMapper.toEntity(model);
        expect(entity.uuid).toBeDefined();
        expect(entity.tenantUUID).toBe(TENANT_UUID);
        expect(entity.name).toBe('Bodega Test');
        expect(entity.description).toBe('Test bodega');
        expect(entity.icon).toBe('bodega-icon');
        expect(entity.color).toBe('#AABBCC');
        expect(entity.address).toBe('100 Industrial');
        expect(entity.frozenAt).toBeNull();
        expect(entity.archivedAt).toBeNull();
      });

      it('Then storageId is set when provided', () => {
        const model = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000061',
          tenantUUID: TENANT_UUID,
          name: 'With Storage Id',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '200 St',
        });

        const entity = StoreRoomMapper.toEntity(model, 99);
        expect(entity.storageId).toBe(99);
      });

      it('Then address is null when the model has no address', () => {
        const model = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000062',
          tenantUUID: TENANT_UUID,
          name: 'No Addr Bodega',
          icon: 'icon-1',
          color: '#AABBCC',
        });

        const entity = StoreRoomMapper.toEntity(model);
        expect(entity.address).toBeNull();
      });
    });
  });

  describe('Given a StoreRoomEntity without an address', () => {
    describe('When toDomain is called', () => {
      it('Then address is null on the model', () => {
        const entity = {
          id: 5,
          uuid: '019538a0-0000-7000-8000-000000000063',
          tenantUUID: TENANT_UUID,
          storageId: 5,
          name: 'No Addr Bodega',
          description: null,
          icon: 'store-icon',
          color: '#334455',
          address: null,
          frozenAt: null,
          archivedAt: null,
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-02-02'),
        } as unknown as StoreRoomEntity;

        const model = StoreRoomMapper.toDomain(entity);
        expect(model.address).toBeNull();
      });
    });
  });
});

// ── WarehouseMapper ─────────────────────────────────────────────────────────────

describe('WarehouseMapper', () => {
  describe('Given a WarehouseEntity with all fields set', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a WarehouseModel with all fields mapped', () => {
        const entity = {
          id: 3,
          uuid: '019538a0-0000-7000-8000-000000000030',
          tenantUUID: TENANT_UUID,
          storageId: 3,
          name: 'Central WH',
          description: 'Main warehouse',
          icon: 'wh-icon',
          color: '#667788',
          address: '200 Warehouse Blvd',
          frozenAt: null,
          archivedAt: null,
          createdAt: new Date('2024-03-01'),
          updatedAt: new Date('2024-03-02'),
        } as WarehouseEntity;

        const model = WarehouseMapper.toDomain(entity);
        expect(model.uuid.toString()).toBe('019538a0-0000-7000-8000-000000000030');
        expect(model.tenantUUID).toBe(TENANT_UUID);
        expect(model.name.getValue()).toBe('Central WH');
        expect(model.description?.getValue()).toBe('Main warehouse');
        expect(model.icon.getValue()).toBe('wh-icon');
        expect(model.color.getValue()).toBe('#667788');
        expect(model.address!.getValue()).toBe('200 Warehouse Blvd');
        expect(model.frozenAt).toBeNull();
        expect(model.archivedAt).toBeNull();
      });

      it('Then description is null when not set on entity', () => {
        const entity = {
          id: 4,
          uuid: '019538a0-0000-7000-8000-000000000039',
          tenantUUID: TENANT_UUID,
          storageId: 4,
          name: 'No Desc WH',
          description: null,
          icon: 'icon-1',
          color: '#AABBCC',
          address: '300 St',
          frozenAt: null,
          archivedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        } as unknown as WarehouseEntity;

        const model = WarehouseMapper.toDomain(entity);
        expect(model.description).toBeNull();
      });
    });
  });

  describe('Given a WarehouseModel created via create()', () => {
    describe('When toEntity is called on a newly created warehouse', () => {
      it('Then id is not included in the entity (sentinel id=0 excluded)', () => {
        const model = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000070',
          tenantUUID: TENANT_UUID,
          name: 'WH Test',
          description: 'Test warehouse',
          icon: 'wh-test-icon',
          color: '#DDEEFF',
          address: '700 Blvd',
        });

        const entity = WarehouseMapper.toEntity(model);
        expect(entity.uuid).toBeDefined();
        expect(entity.tenantUUID).toBe(TENANT_UUID);
        expect(entity.name).toBe('WH Test');
        expect(entity.description).toBe('Test warehouse');
        expect(entity.icon).toBe('wh-test-icon');
        expect(entity.color).toBe('#DDEEFF');
        expect(entity.address).toBe('700 Blvd');
        expect(entity.frozenAt).toBeNull();
        expect(entity.archivedAt).toBeNull();
        expect(entity.id).toBeUndefined();
      });

      it('Then storageId is set when provided', () => {
        const model = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000071',
          tenantUUID: TENANT_UUID,
          name: 'With Storage Id',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '800 St',
        });

        const entity = WarehouseMapper.toEntity(model, 55);
        expect(entity.storageId).toBe(55);
      });
    });
  });
});

// ── StorageMapper (collection-based toDomain) ──────────────────────────────────

describe('StorageMapper', () => {
  describe('Given a StorageEntity and sub-model arrays', () => {
    describe('When toDomain is called with warehouses, storeRooms and customRooms', () => {
      it('Then it returns a StorageAggregate with all collections populated', () => {
        const entity = {
          id: 1,
          uuid: '019538a0-0000-7000-8000-000000000090',
          tenantUUID: TENANT_UUID,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        } as StorageEntity;

        const warehouse = WarehouseModel.create({
          uuid: '019538a0-0000-7000-8000-000000000091',
          tenantUUID: TENANT_UUID,
          name: 'WH',
          icon: 'warehouse',
          color: '#3b82f6',
          address: '100 St',
        });

        const storeRoom = StoreRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000092',
          tenantUUID: TENANT_UUID,
          name: 'SR',
          icon: 'inventory_2',
          color: '#d97706',
          address: '200 St',
        });

        const customRoom = CustomRoomModel.create({
          uuid: '019538a0-0000-7000-8000-000000000093',
          tenantUUID: TENANT_UUID,
          name: 'CR',
          roomType: 'Office',
          icon: 'other_houses',
          color: '#6b7280',
          address: '300 St',
        });

        const aggregate = StorageMapper.toDomain(entity, [warehouse], [storeRoom], [customRoom]);

        expect(aggregate.id).toBe(1);
        expect(aggregate.uuid).toBe('019538a0-0000-7000-8000-000000000090');
        expect(aggregate.tenantUUID).toBe(TENANT_UUID);
        expect(aggregate.warehouses).toHaveLength(1);
        expect(aggregate.storeRooms).toHaveLength(1);
        expect(aggregate.customRooms).toHaveLength(1);
      });
    });

    describe('When toDomain is called with empty sub-model arrays', () => {
      it('Then it returns a StorageAggregate with empty collections', () => {
        const entity = {
          id: 2,
          uuid: '019538a0-0000-7000-8000-000000000095',
          tenantUUID: TENANT_UUID,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as StorageEntity;

        const aggregate = StorageMapper.toDomain(entity, [], [], []);

        expect(aggregate.warehouses).toHaveLength(0);
        expect(aggregate.storeRooms).toHaveLength(0);
        expect(aggregate.customRooms).toHaveLength(0);
      });
    });
  });
});

// ── StorageActivityLogMapper ────────────────────────────────────────────────────

const LOG_STORAGE_UUID = '019538a0-0000-7000-8000-000000000001';
const LOG_TENANT_UUID = '019538a0-0000-7000-8000-000000000002';
const LOG_ACTOR_UUID = '019538a0-0000-7000-8000-000000000003';
const LOG_ENTRY_UUID = '019538a0-0000-7000-8000-000000000099';

describe('StorageActivityLogMapper', () => {
  describe('Given a StorageActivityLogEntity with all fields set', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a StorageActivityLogEntry with all fields mapped correctly', () => {
        const occurredAt = new Date('2026-01-15T10:00:00Z');
        const entity = {
          id: 5,
          uuid: LOG_ENTRY_UUID,
          storageUUID: LOG_STORAGE_UUID,
          tenantUUID: LOG_TENANT_UUID,
          actorUUID: LOG_ACTOR_UUID,
          action: StorageActivityAction.CREATED,
          previousValue: null,
          newValue: { name: 'Bodega Norte', type: 'WAREHOUSE' },
          occurredAt,
        } as unknown as StorageActivityLogEntity;

        const entry = StorageActivityLogMapper.toDomain(entity);

        expect(entry.id).toBe(5);
        expect(entry.uuid.toString()).toBe(LOG_ENTRY_UUID);
        expect(entry.storageUUID.toString()).toBe(LOG_STORAGE_UUID);
        expect(entry.tenantUUID.toString()).toBe(LOG_TENANT_UUID);
        expect(entry.actorUUID.toString()).toBe(LOG_ACTOR_UUID);
        expect(entry.action).toBe(StorageActivityAction.CREATED);
        expect(entry.previousValue).toBeNull();
        expect(entry.newValue).toEqual({ name: 'Bodega Norte', type: 'WAREHOUSE' });
        expect(entry.occurredAt).toEqual(occurredAt);
      });

      it('Then previousValue and newValue are preserved when both are present', () => {
        const entity = {
          id: 6,
          uuid: LOG_ENTRY_UUID,
          storageUUID: LOG_STORAGE_UUID,
          tenantUUID: LOG_TENANT_UUID,
          actorUUID: LOG_ACTOR_UUID,
          action: StorageActivityAction.NAME_CHANGED,
          previousValue: { value: 'Old Name' },
          newValue: { value: 'New Name' },
          occurredAt: new Date(),
        } as unknown as StorageActivityLogEntity;

        const entry = StorageActivityLogMapper.toDomain(entity);

        expect(entry.previousValue).toEqual({ value: 'Old Name' });
        expect(entry.newValue).toEqual({ value: 'New Name' });
        expect(entry.action).toBe(StorageActivityAction.NAME_CHANGED);
      });
    });
  });

  describe('Given a StorageActivityLogEntry created via create()', () => {
    describe('When toEntity is called', () => {
      it('Then the entity has all fields set and id is not assigned', () => {
        const entry = StorageActivityLogEntry.create({
          storageUUID: LOG_STORAGE_UUID,
          tenantUUID: LOG_TENANT_UUID,
          actorUUID: LOG_ACTOR_UUID,
          action: StorageActivityAction.ARCHIVED,
          previousValue: null,
          newValue: null,
        });

        const entity = StorageActivityLogMapper.toEntity(entry);

        expect(entity.uuid).toBeDefined();
        expect(entity.storageUUID).toBe(LOG_STORAGE_UUID);
        expect(entity.tenantUUID).toBe(LOG_TENANT_UUID);
        expect(entity.actorUUID).toBe(LOG_ACTOR_UUID);
        expect(entity.action).toBe(StorageActivityAction.ARCHIVED);
        expect(entity.previousValue).toBeNull();
        expect(entity.newValue).toBeNull();
        expect(entity.id).toBeUndefined();
      });

      it('Then previousValue and newValue are mapped when set', () => {
        const entry = StorageActivityLogEntry.create({
          storageUUID: LOG_STORAGE_UUID,
          tenantUUID: LOG_TENANT_UUID,
          actorUUID: LOG_ACTOR_UUID,
          action: StorageActivityAction.COLOR_CHANGED,
          previousValue: { value: '#6b7280' },
          newValue: { value: '#3b82f6' },
        });

        const entity = StorageActivityLogMapper.toEntity(entry);

        expect(entity.previousValue).toEqual({ value: '#6b7280' });
        expect(entity.newValue).toEqual({ value: '#3b82f6' });
      });
    });
  });

  describe('Given a StorageActivityLogEntry reconstituted with an id', () => {
    describe('When toEntity is called', () => {
      it('Then the entity id is set', () => {
        const entry = StorageActivityLogEntry.reconstitute({
          id: 99,
          uuid: new UUIDVO(LOG_ENTRY_UUID),
          storageUUID: new UUIDVO(LOG_STORAGE_UUID),
          tenantUUID: new UUIDVO(LOG_TENANT_UUID),
          actorUUID: new UUIDVO(LOG_ACTOR_UUID),
          action: StorageActivityAction.FROZEN,
          previousValue: null,
          newValue: null,
          occurredAt: new Date(),
        });

        const entity = StorageActivityLogMapper.toEntity(entry);

        expect(entity.id).toBe(99);
      });
    });
  });
});
