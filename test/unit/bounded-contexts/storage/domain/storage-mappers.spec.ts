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
          name: 'Office Room',
          description: 'Main office space',
          icon: 'office-icon',
          color: '#AABBCC',
          roomType: 'Office',
          address: '123 Main St',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        } as CustomRoomEntity;

        const model = CustomRoomMapper.toDomain(entity);
        expect(model.uuid.toString()).toBe('019538a0-0000-7000-8000-000000000010');
        expect(model.name.getValue()).toBe('Office Room');
        expect(model.description?.getValue()).toBe('Main office space');
        expect(model.icon.getValue()).toBe('office-icon');
        expect(model.color.getValue()).toBe('#AABBCC');
        expect(model.roomType.getValue()).toBe('Office');
        expect(model.address.getValue()).toBe('123 Main St');
        expect(model.createdAt).toEqual(new Date('2024-01-01'));
      });

      it('Then description is null when not set on entity', () => {
        const entity = {
          id: 2,
          uuid: '019538a0-0000-7000-8000-000000000019',
          storageId: 2,
          name: 'No Desc Room',
          description: null,
          icon: 'icon-1',
          color: '#AABBCC',
          roomType: 'Storage',
          address: '456 Ave',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        } as unknown as CustomRoomEntity;

        const model = CustomRoomMapper.toDomain(entity);
        expect(model.description).toBeNull();
      });
    });
  });

  describe('Given a CustomRoomModel', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a partial entity with all business fields', () => {
        const aggregate = StorageAggregate.createCustomRoom({
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          name: 'Test Room',
          description: 'A test room',
          icon: 'test-icon',
          color: '#112233',
          roomType: 'Kitchen',
          address: '456 Oak Ave',
        });

        const model = aggregate.customRoom!;
        const entity = CustomRoomMapper.toEntity(model);
        expect(entity.uuid).toBeDefined();
        expect(entity.name).toBe('Test Room');
        expect(entity.description).toBe('A test room');
        expect(entity.icon).toBe('test-icon');
        expect(entity.color).toBe('#112233');
        expect(entity.roomType).toBe('Kitchen');
        expect(entity.address).toBe('456 Oak Ave');
      });

      it('Then description is null when model has no description', () => {
        const aggregate = StorageAggregate.createCustomRoom({
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          name: 'No Desc Room',
          roomType: 'Storage',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '789 Elm St',
        });

        const entity = CustomRoomMapper.toEntity(aggregate.customRoom!);
        expect(entity.description).toBeNull();
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
          name: 'Main Bodega',
          description: 'Primary storage',
          icon: 'store-icon',
          color: '#334455',
          address: '789 Elm Rd',
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-02-02'),
        } as StoreRoomEntity;

        const model = StoreRoomMapper.toDomain(entity);
        expect(model.uuid.toString()).toBe('019538a0-0000-7000-8000-000000000020');
        expect(model.name.getValue()).toBe('Main Bodega');
        expect(model.description?.getValue()).toBe('Primary storage');
        expect(model.icon.getValue()).toBe('store-icon');
        expect(model.color.getValue()).toBe('#334455');
        expect(model.address.getValue()).toBe('789 Elm Rd');
      });

      it('Then description is null when not set on entity', () => {
        const entity = {
          id: 3,
          uuid: '019538a0-0000-7000-8000-000000000029',
          storageId: 3,
          name: 'No Desc Store',
          description: null,
          icon: 'icon-1',
          color: '#AABBCC',
          address: '100 St',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        } as unknown as StoreRoomEntity;

        const model = StoreRoomMapper.toDomain(entity);
        expect(model.description).toBeNull();
      });
    });
  });

  describe('Given a StoreRoomModel', () => {
    describe('When toEntity is called', () => {
      it('Then it returns a partial entity with all business fields', () => {
        const aggregate = StorageAggregate.createStoreRoom({
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          name: 'Bodega Test',
          description: 'Test bodega',
          icon: 'bodega-icon',
          color: '#AABBCC',
          address: '100 Industrial',
        });

        const model = aggregate.storeRoom!;
        const entity = StoreRoomMapper.toEntity(model);
        expect(entity.uuid).toBeDefined();
        expect(entity.name).toBe('Bodega Test');
        expect(entity.description).toBe('Test bodega');
        expect(entity.icon).toBe('bodega-icon');
        expect(entity.color).toBe('#AABBCC');
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
          name: 'Central WH',
          description: 'Main warehouse',
          icon: 'wh-icon',
          color: '#667788',
          address: '200 Warehouse Blvd',
          createdAt: new Date('2024-03-01'),
          updatedAt: new Date('2024-03-02'),
        } as WarehouseEntity;

        const model = WarehouseMapper.toDomain(entity);
        expect(model.uuid.toString()).toBe('019538a0-0000-7000-8000-000000000030');
        expect(model.name.getValue()).toBe('Central WH');
        expect(model.description?.getValue()).toBe('Main warehouse');
        expect(model.icon.getValue()).toBe('wh-icon');
        expect(model.color.getValue()).toBe('#667788');
        expect(model.address.getValue()).toBe('200 Warehouse Blvd');
      });

      it('Then description is null when not set on entity', () => {
        const entity = {
          id: 4,
          uuid: '019538a0-0000-7000-8000-000000000039',
          storageId: 4,
          name: 'No Desc WH',
          description: null,
          icon: 'icon-1',
          color: '#AABBCC',
          address: '300 St',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        } as unknown as WarehouseEntity;

        const model = WarehouseMapper.toDomain(entity);
        expect(model.description).toBeNull();
      });
    });
  });

  describe('Given a WarehouseModel', () => {
    describe('When toEntity is called on a newly created warehouse', () => {
      it('Then id is not included in the entity (sentinel id=0 excluded)', () => {
        const aggregate = StorageAggregate.createWarehouse({
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          name: 'WH Test',
          description: 'Test warehouse',
          icon: 'wh-test-icon',
          color: '#DDEEFF',
          address: '700 Blvd',
        });

        const model = aggregate.warehouse!;
        const entity = WarehouseMapper.toEntity(model);
        expect(entity.uuid).toBeDefined();
        expect(entity.name).toBe('WH Test');
        expect(entity.description).toBe('Test warehouse');
        expect(entity.icon).toBe('wh-test-icon');
        expect(entity.color).toBe('#DDEEFF');
        expect(entity.address).toBe('700 Blvd');
        expect(entity.id).toBeUndefined();
      });
    });
  });
});

// ── StorageMapper ───────────────────────────────────────────────────────────────

describe('StorageMapper', () => {
  describe('Given a StorageEntity with a CustomRoom relation', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a StorageAggregate with name and fields from the customRoom sub-entity', () => {
        const entity = {
          id: 1,
          uuid: '019538a0-0000-7000-8000-000000000050',
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          type: 'CUSTOM_ROOM',
          parentUUID: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          customRoom: {
            id: 1,
            uuid: '019538a0-0000-7000-8000-000000000051',
            storageId: 1,
            name: 'Office',
            description: 'Main office',
            icon: 'office-icon',
            color: '#112233',
            roomType: 'Office',
            address: '123 Main',
            frozenAt: null,
            archivedAt: null,
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
        expect(aggregate.description).toBe('Main office');
        expect(aggregate.icon).toBe('office-icon');
        expect(aggregate.color).toBe('#112233');
        expect(aggregate.customRoom).not.toBeNull();
        expect(aggregate.customRoom?.roomType.getValue()).toBe('Office');
        expect(aggregate.storeRoom).toBeNull();
        expect(aggregate.warehouse).toBeNull();
      });
    });
  });

  describe('Given a StorageEntity with a StoreRoom relation', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a StorageAggregate with name and fields from the storeRoom sub-entity', () => {
        const entity = {
          id: 2,
          uuid: '019538a0-0000-7000-8000-000000000060',
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          type: 'STORE_ROOM',
          parentUUID: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          customRoom: null,
          storeRoom: {
            id: 2,
            uuid: '019538a0-0000-7000-8000-000000000061',
            storageId: 2,
            name: 'Bodega',
            description: null,
            icon: 'store-icon',
            color: '#334455',
            address: '456 Ave',
            frozenAt: null,
            archivedAt: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
          warehouse: null,
        } as unknown as StorageEntity;

        const aggregate = StorageMapper.toDomain(entity);
        expect(aggregate.type).toBe(StorageType.STORE_ROOM);
        expect(aggregate.name).toBe('Bodega');
        expect(aggregate.storeRoom).not.toBeNull();
        expect(aggregate.storeRoom?.address.getValue()).toBe('456 Ave');
      });
    });
  });

  describe('Given a StorageEntity with a Warehouse relation', () => {
    describe('When toDomain is called', () => {
      it('Then it returns a StorageAggregate with name and fields from the warehouse sub-entity', () => {
        const entity = {
          id: 3,
          uuid: '019538a0-0000-7000-8000-000000000070',
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          type: 'WAREHOUSE',
          parentUUID: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          customRoom: null,
          storeRoom: null,
          warehouse: {
            id: 3,
            uuid: '019538a0-0000-7000-8000-000000000071',
            storageId: 3,
            name: 'Central WH',
            description: null,
            icon: 'wh-icon',
            color: '#667788',
            address: '789 Industrial',
            frozenAt: null,
            archivedAt: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        } as unknown as StorageEntity;

        const aggregate = StorageMapper.toDomain(entity);
        expect(aggregate.type).toBe(StorageType.WAREHOUSE);
        expect(aggregate.name).toBe('Central WH');
        expect(aggregate.warehouse).not.toBeNull();
        expect(aggregate.warehouse?.address.getValue()).toBe('789 Industrial');
      });
    });
  });

  describe('Given a StorageEntity with frozenAt set on the sub-entity', () => {
    describe('When toDomain is called', () => {
      it('Then the aggregate status is FROZEN and frozenAt is mapped', () => {
        const frozenDate = new Date('2024-06-01');
        const entity = {
          id: 4,
          uuid: '019538a0-0000-7000-8000-000000000080',
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          type: 'CUSTOM_ROOM',
          parentUUID: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          customRoom: {
            id: 4,
            uuid: '019538a0-0000-7000-8000-000000000081',
            storageId: 4,
            name: 'Frozen Room',
            description: null,
            icon: 'icon-1',
            color: '#AABBCC',
            roomType: 'Storage',
            address: '100 St',
            frozenAt: frozenDate,
            archivedAt: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
          storeRoom: null,
          warehouse: null,
        } as unknown as StorageEntity;

        const aggregate = StorageMapper.toDomain(entity);
        expect(aggregate.status).toBe('FROZEN');
        expect(aggregate.frozenAt).toEqual(frozenDate);
        expect(aggregate.isFrozen()).toBe(true);
      });
    });
  });

  describe('Given a StorageAggregate with a CustomRoom', () => {
    describe('When toEntity is called', () => {
      it('Then the customRoom sub-entity carries the name and business fields', () => {
        const aggregate = StorageAggregate.createCustomRoom({
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          name: 'Mapper Test Room',
          description: 'A description',
          icon: 'room-icon',
          color: '#AABBCC',
          roomType: 'Workshop',
          address: '500 St',
        });

        const entity = StorageMapper.toEntity(aggregate);
        expect(entity.uuid).toBeDefined();
        expect(entity.tenantUUID).toBe('019538a0-0000-7000-8000-000000000001');
        expect(entity.type).toBe(StorageType.CUSTOM_ROOM);
        expect(entity.customRoom).toBeDefined();
        expect((entity.customRoom as { name?: string })?.name).toBe('Mapper Test Room');
        expect((entity.customRoom as { description?: string })?.description).toBe('A description');
        expect((entity.customRoom as { icon?: string })?.icon).toBe('room-icon');
        expect((entity.customRoom as { color?: string })?.color).toBe('#AABBCC');
        expect(entity.id).toBeUndefined();
      });
    });
  });

  describe('Given a StorageAggregate with a StoreRoom', () => {
    describe('When toEntity is called', () => {
      it('Then the storeRoom sub-entity carries the name', () => {
        const aggregate = StorageAggregate.createStoreRoom({
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          name: 'Store Test',
          icon: 'store-icon',
          color: '#AABBCC',
          address: '600 Ave',
        });

        const entity = StorageMapper.toEntity(aggregate);
        expect(entity.storeRoom).toBeDefined();
        expect((entity.storeRoom as { name?: string })?.name).toBe('Store Test');
      });
    });
  });

  describe('Given a StorageAggregate with a Warehouse', () => {
    describe('When toEntity is called', () => {
      it('Then the warehouse sub-entity carries the name', () => {
        const aggregate = StorageAggregate.createWarehouse({
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          name: 'WH Test',
          icon: 'wh-icon',
          color: '#DDEEFF',
          address: '700 Blvd',
        });

        const entity = StorageMapper.toEntity(aggregate);
        expect(entity.warehouse).toBeDefined();
        expect((entity.warehouse as { name?: string })?.name).toBe('WH Test');
      });
    });
  });

  describe('Given a StorageEntity of type CUSTOM_ROOM with a missing customRoom relation', () => {
    describe('When toDomain is called', () => {
      it('Then an error is thrown', () => {
        const entity = {
          id: 99,
          uuid: '019538a0-0000-7000-8000-000000000099',
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          type: StorageType.CUSTOM_ROOM,
          parentUUID: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          customRoom: null,
          storeRoom: null,
          warehouse: null,
        } as unknown as StorageEntity;

        expect(() => StorageMapper.toDomain(entity)).toThrow(
          'StorageEntity 019538a0-0000-7000-8000-000000000099 missing customRoom',
        );
      });
    });
  });

  describe('Given a StorageEntity of type STORE_ROOM with a missing storeRoom relation', () => {
    describe('When toDomain is called', () => {
      it('Then an error is thrown', () => {
        const entity = {
          id: 98,
          uuid: '019538a0-0000-7000-8000-000000000098',
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          type: StorageType.STORE_ROOM,
          parentUUID: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          customRoom: null,
          storeRoom: null,
          warehouse: null,
        } as unknown as StorageEntity;

        expect(() => StorageMapper.toDomain(entity)).toThrow(
          'StorageEntity 019538a0-0000-7000-8000-000000000098 missing storeRoom',
        );
      });
    });
  });

  describe('Given a StorageEntity of type WAREHOUSE with a missing warehouse relation', () => {
    describe('When toDomain is called', () => {
      it('Then an error is thrown', () => {
        const entity = {
          id: 97,
          uuid: '019538a0-0000-7000-8000-000000000097',
          tenantUUID: '019538a0-0000-7000-8000-000000000001',
          type: StorageType.WAREHOUSE,
          parentUUID: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          customRoom: null,
          storeRoom: null,
          warehouse: null,
        } as unknown as StorageEntity;

        expect(() => StorageMapper.toDomain(entity)).toThrow(
          'StorageEntity 019538a0-0000-7000-8000-000000000097 missing warehouse',
        );
      });
    });
  });
});
