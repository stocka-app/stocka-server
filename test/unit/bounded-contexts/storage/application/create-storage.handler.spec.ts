import { EventPublisher } from '@nestjs/cqrs';
import { CreateStorageHandler } from '@storage/application/commands/create-storage/create-storage.handler';
import { CreateStorageCommand } from '@storage/application/commands/create-storage/create-storage.command';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.interface';
import {
  ITenantCapabilitiesPort,
  TenantCapabilities,
} from '@storage/application/ports/tenant-capabilities.port';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { WarehouseRequiresTierUpgradeError } from '@storage/application/errors/warehouse-requires-tier-upgrade.error';
import { CustomRoomLimitReachedError } from '@storage/application/errors/custom-room-limit-reached.error';
import { StoreRoomLimitReachedError } from '@storage/application/errors/store-room-limit-reached.error';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';

describe('CreateStorageHandler', () => {
  let handler: CreateStorageHandler;
  let storageRepository: jest.Mocked<IStorageRepository>;
  let capabilitiesPort: jest.Mocked<ITenantCapabilitiesPort>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';

  const mockMergeObjectContext = jest.fn((aggregate: StorageAggregate): StorageAggregate => {
    aggregate.commit = jest.fn();
    return aggregate;
  });

  beforeEach(() => {
    storageRepository = {
      findByUUID: jest.fn(),
      findAll: jest.fn(),
      countActiveByType: jest.fn(),
      existsActiveName: jest.fn(),
      save: jest.fn(),
      archive: jest.fn(),
    };

    capabilitiesPort = {
      getCapabilities: jest.fn(),
    };

    eventPublisher = {
      mergeObjectContext: mockMergeObjectContext,
    } as unknown as jest.Mocked<EventPublisher>;

    handler = new CreateStorageHandler(storageRepository, capabilitiesPort, eventPublisher);
  });

  const starterCapabilities: TenantCapabilities = {
    canCreateWarehouse: (): boolean => true,
    canCreateMoreWarehouses: (count: number): boolean => count < 1,
    canCreateMoreCustomRooms: (count: number): boolean => count < 3,
    canCreateMoreStoreRooms: (count: number): boolean => count < 3,
  };

  const freeCapabilities: TenantCapabilities = {
    canCreateWarehouse: (): boolean => false,
    canCreateMoreWarehouses: (): boolean => false,
    canCreateMoreCustomRooms: (count: number): boolean => count < 1,
    canCreateMoreStoreRooms: (count: number): boolean => count < 1,
  };

  describe('Given a STARTER tenant that has already reached the WAREHOUSE limit (1 existing)', () => {
    describe('When the command is executed to create another WAREHOUSE', () => {
      it('Then it returns a WarehouseRequiresTierUpgradeError', async () => {
        const atLimitCapabilities: TenantCapabilities = {
          canCreateWarehouse: (): boolean => true,
          canCreateMoreWarehouses: (): boolean => false,
          canCreateMoreCustomRooms: (count: number): boolean => count < 3,
          canCreateMoreStoreRooms: (count: number): boolean => count < 3,
        };
        capabilitiesPort.getCapabilities.mockResolvedValue(atLimitCapabilities);
        storageRepository.countActiveByType.mockResolvedValue(1);

        const command = new CreateStorageCommand(
          TENANT_UUID,
          StorageType.WAREHOUSE,
          'Second Warehouse',
          undefined,
          '999 Industrial Blvd',
          undefined,
        );

        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(WarehouseRequiresTierUpgradeError));
      });
    });
  });

  describe('Given a tenant on the FREE tier trying to create a WAREHOUSE', () => {
    describe('When the command is executed', () => {
      it('Then it returns a WarehouseRequiresTierUpgradeError', async () => {
        capabilitiesPort.getCapabilities.mockResolvedValue(freeCapabilities);

        const command = new CreateStorageCommand(
          TENANT_UUID,
          StorageType.WAREHOUSE,
          'My Warehouse',
          undefined,
          '123 Industrial Ave',
          undefined,
        );

        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(WarehouseRequiresTierUpgradeError));
      });
    });
  });

  describe('Given a tenant that has reached the CUSTOM_ROOM limit', () => {
    describe('When the command is executed to create another CUSTOM_ROOM', () => {
      it('Then it returns a CustomRoomLimitReachedError', async () => {
        capabilitiesPort.getCapabilities.mockResolvedValue(freeCapabilities);
        storageRepository.countActiveByType.mockResolvedValue(1);

        const command = new CreateStorageCommand(
          TENANT_UUID,
          StorageType.CUSTOM_ROOM,
          'Extra Room',
          undefined,
          undefined,
          'Office',
        );

        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(CustomRoomLimitReachedError));
      });
    });
  });

  describe('Given a tenant that has reached the STORE_ROOM limit', () => {
    describe('When the command is executed to create another STORE_ROOM', () => {
      it('Then it returns a StoreRoomLimitReachedError', async () => {
        capabilitiesPort.getCapabilities.mockResolvedValue(freeCapabilities);
        storageRepository.countActiveByType.mockResolvedValue(1);

        const command = new CreateStorageCommand(
          TENANT_UUID,
          StorageType.STORE_ROOM,
          'Extra Store',
          undefined,
          undefined,
          undefined,
        );

        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(StoreRoomLimitReachedError));
      });
    });
  });

  describe('Given a storage name that already exists for the tenant', () => {
    describe('When the command is executed', () => {
      it('Then it returns a StorageNameAlreadyExistsError', async () => {
        capabilitiesPort.getCapabilities.mockResolvedValue(starterCapabilities);
        storageRepository.countActiveByType.mockResolvedValue(0);
        storageRepository.existsActiveName.mockResolvedValue(true);

        const command = new CreateStorageCommand(
          TENANT_UUID,
          StorageType.CUSTOM_ROOM,
          'Duplicate Name',
          undefined,
          undefined,
          'Office',
        );

        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        result.mapErr((e) => expect(e).toBeInstanceOf(StorageNameAlreadyExistsError));
      });
    });
  });

  describe('Given a STARTER tenant with available CUSTOM_ROOM slots and a unique name', () => {
    describe('When the command is executed to create a CUSTOM_ROOM', () => {
      it('Then it creates the storage and returns the UUID', async () => {
        capabilitiesPort.getCapabilities.mockResolvedValue(starterCapabilities);
        storageRepository.countActiveByType.mockResolvedValue(1);
        storageRepository.existsActiveName.mockResolvedValue(false);
        storageRepository.save.mockImplementation(
          (a: StorageAggregate): Promise<StorageAggregate> => Promise.resolve(a),
        );

        const command = new CreateStorageCommand(
          TENANT_UUID,
          StorageType.CUSTOM_ROOM,
          'New Room',
          undefined,
          '123 Main St',
          'Office',
        );

        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        result.map((data) => {
          expect(data.storageUUID).toBeDefined();
        });
        expect(storageRepository.save).toHaveBeenCalledTimes(1);
        expect(mockMergeObjectContext).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given a STARTER tenant with available STORE_ROOM slots', () => {
    describe('When the command is executed to create a STORE_ROOM', () => {
      it('Then it creates the storage and returns the UUID', async () => {
        capabilitiesPort.getCapabilities.mockResolvedValue(starterCapabilities);
        storageRepository.countActiveByType.mockResolvedValue(0);
        storageRepository.existsActiveName.mockResolvedValue(false);
        storageRepository.save.mockImplementation(
          (a: StorageAggregate): Promise<StorageAggregate> => Promise.resolve(a),
        );

        const command = new CreateStorageCommand(
          TENANT_UUID,
          StorageType.STORE_ROOM,
          'Main Bodega',
          undefined,
          '456 Ave',
          undefined,
        );

        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        result.map((data) => {
          expect(data.storageUUID).toBeDefined();
        });
      });
    });
  });

  describe('Given a STARTER tenant creating a WAREHOUSE', () => {
    describe('When the command is executed with a valid address', () => {
      it('Then it creates the warehouse and returns the UUID', async () => {
        capabilitiesPort.getCapabilities.mockResolvedValue(starterCapabilities);
        storageRepository.countActiveByType.mockResolvedValue(0);
        storageRepository.existsActiveName.mockResolvedValue(false);
        storageRepository.save.mockImplementation(
          (a: StorageAggregate): Promise<StorageAggregate> => Promise.resolve(a),
        );

        const command = new CreateStorageCommand(
          TENANT_UUID,
          StorageType.WAREHOUSE,
          'Central Warehouse',
          undefined,
          '789 Industrial Blvd',
          undefined,
        );

        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        result.map((data) => {
          expect(data.storageUUID).toBeDefined();
        });
      });
    });
  });

  describe('Given a CUSTOM_ROOM creation without an explicit roomType', () => {
    describe('When the command is executed', () => {
      it('Then the roomType defaults to General', async () => {
        capabilitiesPort.getCapabilities.mockResolvedValue(starterCapabilities);
        storageRepository.countActiveByType.mockResolvedValue(0);
        storageRepository.existsActiveName.mockResolvedValue(false);
        storageRepository.save.mockImplementation(
          (aggregate: StorageAggregate): Promise<StorageAggregate> => {
            expect(aggregate.customRoom?.roomType).toBe('General');
            return Promise.resolve(aggregate);
          },
        );

        const command = new CreateStorageCommand(
          TENANT_UUID,
          StorageType.CUSTOM_ROOM,
          'Default Room',
          undefined,
          undefined,
          undefined,
        );

        const result = await handler.execute(command);
        expect(result.isOk()).toBe(true);
      });
    });
  });
});
