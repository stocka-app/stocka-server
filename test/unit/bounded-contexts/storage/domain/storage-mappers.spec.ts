import { StorageMapper } from '@storage/infrastructure/mappers/storage.mapper';
import { CustomRoomMapper } from '@storage/infrastructure/mappers/custom-room.mapper';
import { StoreRoomMapper } from '@storage/infrastructure/mappers/store-room.mapper';
import { WarehouseMapper } from '@storage/infrastructure/mappers/warehouse.mapper';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageEntity } from '@storage/infrastructure/entities/storage.entity';
import { CustomRoomEntity } from '@storage/infrastructure/entities/custom-room.entity';
import { StoreRoomEntity } from '@storage/infrastructure/entities/store-room.entity';
import { WarehouseEntity } from '@storage/infrastructure/entities/warehouse.entity';

// ── CustomRoomMapper ────────────────────────────────────────────────────────────

describe('CustomRoomMapper', () => {
  describe('Given a CustomRoomEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a CustomRoomModel with all fields mapped', () => {
        const entity = {
          id: 1,
          uuid: '019538a0-0000-7000-8000-000000000010',
          storageId: 1,
          roomType: 'Office',
          address: '123 Main St',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        } as CustomRoomEntity;

        const model = CustomRoomMapper.toDomain(entity);
        expect(model.uuid).toBe('019538a0-0000-7000-8000-000000000010');
        expect(model.roomType).toBe('Office');
        expect(model.address).toBe('123 Main St');
        expect(model.createdAt).toEqual(new Date('2024-01-01'));
      });
    });
  });

  describe('Given a CustomRoomModel', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a partial entity', () => {
        const aggregate = StorageAggregate.createCustomRoom({
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          name: 'Test',
          roomType: 'Kitchen',
          address: '456 Oak Ave',
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const model = aggregate.customRoom!;
        const entity = CustomRoomMapper.toEntity(model);
        expect(entity.uuid).toBeDefined();
        expect(entity.roomType).toBe('Kitchen');
        expect(entity.address).toBe('456 Oak Ave');
      });
    });
  });
});

// ── StoreRoomMapper ─────────────────────────────────────────────────────────────

describe('StoreRoomMapper', () => {
  describe('Given a StoreRoomEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a StoreRoomModel with all fields mapped', () => {
        const entity = {
          id: 2,
          uuid: '019538a0-0000-7000-8000-000000000020',
          storageId: 2,
          address: '789 Elm Rd',
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-02-02'),
        } as StoreRoomEntity;

        const model = StoreRoomMapper.toDomain(entity);
        expect(model.uuid).toBe('019538a0-0000-7000-8000-000000000020');
        expect(model.address).toBe('789 Elm Rd');
      });
    });
  });

  describe('Given a StoreRoomModel', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a partial entity', () => {
        const aggregate = StorageAggregate.createStoreRoom({
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          name: 'Bodega',
          address: '100 Industrial',
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const model = aggregate.storeRoom!;
        const entity = StoreRoomMapper.toEntity(model);
        expect(entity.uuid).toBeDefined();
        expect(entity.address).toBe('100 Industrial');
      });
    });
  });
});

// ── WarehouseMapper ─────────────────────────────────────────────────────────────

describe('WarehouseMapper', () => {
  describe('Given a WarehouseEntity', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a WarehouseModel with all fields mapped', () => {
        const entity = {
          id: 3,
          uuid: '019538a0-0000-7000-8000-000000000030',
          storageId: 3,
          address: '200 Warehouse Blvd',
          createdAt: new Date('2024-03-01'),
          updatedAt: new Date('2024-03-02'),
        } as WarehouseEntity;

        const model = WarehouseMapper.toDomain(entity);
        expect(model.uuid).toBe('019538a0-0000-7000-8000-000000000030');
        expect(model.address).toBe('200 Warehouse Blvd');
      });
    });
  });

  describe('Given a WarehouseModel', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a partial entity', () => {
        const aggregate = StorageAggregate.createWarehouse({
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          name: 'Main WH',
          address: '300 Depot Lane',
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const model = aggregate.warehouse!;
        const entity = WarehouseMapper.toEntity(model);
        expect(entity.uuid).toBeDefined();
        expect(entity.address).toBe('300 Depot Lane');
      });
    });
  });
});

// ── StorageMapper ───────────────────────────────────────────────────────────────

describe('StorageMapper', () => {
  describe('Given a StorageEntity with a CustomRoom relation', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a StorageAggregate with the customRoom sub-model', () => {
        const entity = {
          id: 1,
          uuid: '019538a0-0000-7000-8000-000000000050',
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          type: 'CUSTOM_ROOM',
          name: 'Office',
          archivedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          customRoom: {
            id: 1,
            uuid: '019538a0-0000-7000-8000-000000000051',
            storageId: 1,
            roomType: 'Office',
            address: '123 Main',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
          storeRoom: null,
          warehouse: null,
        } as unknown as StorageEntity;

        const aggregate = StorageMapper.toDomain(entity);
        expect(aggregate.id).toBe(1);
        expect(aggregate.type).toBe(StorageType.CUSTOM_ROOM);
        expect(aggregate.name).toBe('Office');
        expect(aggregate.customRoom).not.toBeNull();
        expect(aggregate.customRoom?.roomType).toBe('Office');
        expect(aggregate.storeRoom).toBeNull();
        expect(aggregate.warehouse).toBeNull();
      });
    });
  });

  describe('Given a StorageEntity with a StoreRoom relation', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a StorageAggregate with the storeRoom sub-model', () => {
        const entity = {
          id: 2,
          uuid: '019538a0-0000-7000-8000-000000000060',
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          type: 'STORE_ROOM',
          name: 'Bodega',
          archivedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          customRoom: null,
          storeRoom: {
            id: 2,
            uuid: '019538a0-0000-7000-8000-000000000061',
            storageId: 2,
            address: '456 Ave',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
          warehouse: null,
        } as unknown as StorageEntity;

        const aggregate = StorageMapper.toDomain(entity);
        expect(aggregate.type).toBe(StorageType.STORE_ROOM);
        expect(aggregate.storeRoom).not.toBeNull();
        expect(aggregate.storeRoom?.address).toBe('456 Ave');
      });
    });
  });

  describe('Given a StorageEntity with a Warehouse relation', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a StorageAggregate with the warehouse sub-model', () => {
        const entity = {
          id: 3,
          uuid: '019538a0-0000-7000-8000-000000000070',
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          type: 'WAREHOUSE',
          name: 'Central WH',
          archivedAt: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          customRoom: null,
          storeRoom: null,
          warehouse: {
            id: 3,
            uuid: '019538a0-0000-7000-8000-000000000071',
            storageId: 3,
            address: '789 Industrial',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        } as unknown as StorageEntity;

        const aggregate = StorageMapper.toDomain(entity);
        expect(aggregate.type).toBe(StorageType.WAREHOUSE);
        expect(aggregate.warehouse).not.toBeNull();
        expect(aggregate.warehouse?.address).toBe('789 Industrial');
      });
    });
  });

  describe('Given a StorageAggregate with a CustomRoom', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a partial entity with the customRoom mapped', () => {
        const aggregate = StorageAggregate.createCustomRoom({
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          name: 'Mapper Test Room',
          roomType: 'Workshop',
          address: '500 St',
        });

        const entity = StorageMapper.toEntity(aggregate);
        expect(entity.uuid).toBeDefined();
        expect(entity.tenantUUID).toBe('019538a0-0000-7000-8000-000000000001');
        expect(entity.type).toBe(StorageType.CUSTOM_ROOM);
        expect(entity.name).toBe('Mapper Test Room');
        expect(entity.customRoom).toBeDefined();
        expect(entity.id).toBeUndefined();
      });
    });
  });

  describe('Given a StorageAggregate with a StoreRoom', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a partial entity with the storeRoom mapped', () => {
        const aggregate = StorageAggregate.createStoreRoom({
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          name: 'Store Test',
          address: '600 Ave',
        });

        const entity = StorageMapper.toEntity(aggregate);
        expect(entity.storeRoom).toBeDefined();
      });
    });
  });

  describe('Given a StorageAggregate with a Warehouse', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a partial entity with the warehouse mapped', () => {
        const aggregate = StorageAggregate.createWarehouse({
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          name: 'WH Test',
          address: '700 Blvd',
        });

        const entity = StorageMapper.toEntity(aggregate);
        expect(entity.warehouse).toBeDefined();
      });
    });
  });
});
