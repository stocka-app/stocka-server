import { EventPublisher } from '@nestjs/cqrs';
import { CreateCustomRoomHandler } from '@storage/application/commands/create-custom-room/create-custom-room.handler';
import { CreateCustomRoomCommand } from '@storage/application/commands/create-custom-room/create-custom-room.command';
import { CreateStoreRoomHandler } from '@storage/application/commands/create-store-room/create-store-room.handler';
import { CreateStoreRoomCommand } from '@storage/application/commands/create-store-room/create-store-room.command';
import { CreateWarehouseHandler } from '@storage/application/commands/create-warehouse/create-warehouse.handler';
import { CreateWarehouseCommand } from '@storage/application/commands/create-warehouse/create-warehouse.command';
import {
  WAREHOUSE_DEFAULT_ICON,
  WAREHOUSE_DEFAULT_COLOR,
  STORE_ROOM_DEFAULT_ICON,
  STORE_ROOM_DEFAULT_COLOR,
  CUSTOM_ROOM_DEFAULT_ICON,
  CUSTOM_ROOM_DEFAULT_COLOR,
} from '@storage/domain/services/storage-icon-color.resolver';
import { UpdateCustomRoomHandler } from '@storage/application/commands/update-custom-room/update-custom-room.handler';
import { UpdateCustomRoomCommand } from '@storage/application/commands/update-custom-room/update-custom-room.command';
import { UpdateStoreRoomHandler } from '@storage/application/commands/update-store-room/update-store-room.handler';
import { UpdateStoreRoomCommand } from '@storage/application/commands/update-store-room/update-store-room.command';
import { UpdateWarehouseHandler } from '@storage/application/commands/update-warehouse/update-warehouse.handler';
import { UpdateWarehouseCommand } from '@storage/application/commands/update-warehouse/update-warehouse.command';
import { ArchiveStorageHandler } from '@storage/application/commands/archive-storage/archive-storage.handler';
import { ArchiveStorageCommand } from '@storage/application/commands/archive-storage/archive-storage.command';
import { GetStorageHandler } from '@storage/application/queries/get-storage/get-storage.handler';
import { GetStorageQuery } from '@storage/application/queries/get-storage/get-storage.query';
import { ListStoragesHandler } from '@storage/application/queries/list-storages/list-storages.handler';
import { ListStoragesQuery } from '@storage/application/queries/list-storages/list-storages.query';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { ITenantCapabilitiesPort, TenantCapabilities } from '@storage/application/ports/tenant-capabilities.port';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageAlreadyArchivedError } from '@storage/domain/errors/storage-already-archived.error';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { CustomRoomLimitReachedError } from '@storage/application/errors/custom-room-limit-reached.error';
import { StoreRoomLimitReachedError } from '@storage/application/errors/store-room-limit-reached.error';
import { WarehouseRequiresTierUpgradeError } from '@storage/application/errors/warehouse-requires-tier-upgrade.error';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const STORAGE_UUID = '019538a0-0000-7000-8000-000000000010';

function makeCustomRoomAggregate(archivedAt: Date | null = null): StorageAggregate {
  return StorageAggregate.reconstitute({
    id: 1,
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    parentUUID: null,
    sub: {
      type: StorageType.CUSTOM_ROOM,
      model: CustomRoomModel.create({
        uuid: '019538a0-0000-7000-8000-000000000098',
        name: 'Existing Room',
        roomType: 'Office',
        icon: 'icon-1',
        color: '#AABBCC',
        address: '123 Main St',
      }),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt,
    frozenAt: null,
  });
}

function makeStoreRoomAggregate(archivedAt: Date | null = null): StorageAggregate {
  return StorageAggregate.reconstitute({
    id: 2,
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    parentUUID: null,
    sub: {
      type: StorageType.STORE_ROOM,
      model: StoreRoomModel.create({
        uuid: '019538a0-0000-7000-8000-000000000097',
        name: 'Existing Store',
        icon: 'store-icon',
        color: '#334455',
        address: '456 Oak Ave',
      }),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt,
    frozenAt: null,
  });
}

function makeWarehouseAggregate(archivedAt: Date | null = null): StorageAggregate {
  return StorageAggregate.reconstitute({
    id: 3,
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    parentUUID: null,
    sub: {
      type: StorageType.WAREHOUSE,
      model: WarehouseModel.reconstitute({
        id: 3,
        uuid: { toString: () => '019538a0-0000-7000-8000-000000000096' } as never,
        name: { getValue: () => 'Existing WH' } as never,
        description: null,
        icon: { getValue: () => 'wh-icon' } as never,
        color: { getValue: () => '#667788' } as never,
        address: { getValue: () => '789 Industrial' } as never,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt,
    frozenAt: null,
  });
}

// ── Shared mocks ────────────────────────────────────────────────────────────────

let mockStorageRepository: jest.Mocked<IStorageRepository>;
let mockCapabilitiesPort: jest.Mocked<ITenantCapabilitiesPort>;
let mockEventPublisher: jest.Mocked<EventPublisher>;
let mockCapabilities: jest.Mocked<TenantCapabilities>;

beforeEach(() => {
  mockStorageRepository = {
    findByUUID: jest.fn(),
    findAll: jest.fn(),
    countActiveByType: jest.fn(),
    existsActiveName: jest.fn(),
    save: jest.fn(),
    archive: jest.fn(),
  };

  mockCapabilities = {
    canCreateWarehouse: jest.fn().mockReturnValue(true),
    canCreateMoreWarehouses: jest.fn().mockReturnValue(true),
    canCreateMoreCustomRooms: jest.fn().mockReturnValue(true),
    canCreateMoreStoreRooms: jest.fn().mockReturnValue(true),
  };

  mockCapabilitiesPort = {
    getCapabilities: jest.fn().mockResolvedValue(mockCapabilities),
  };

  mockEventPublisher = {
    mergeObjectContext: jest.fn().mockImplementation((obj: unknown) => obj),
  } as unknown as jest.Mocked<EventPublisher>;
});

// ── CreateCustomRoomHandler ─────────────────────────────────────────────────────

describe('CreateCustomRoomHandler', () => {
  let handler: CreateCustomRoomHandler;

  beforeEach(() => {
    handler = new CreateCustomRoomHandler(
      mockStorageRepository,
      mockCapabilitiesPort,
      mockEventPublisher,
    );
  });

  describe('Given a tenant with available custom room capacity', () => {
    beforeEach(() => {
      mockStorageRepository.countActiveByType.mockResolvedValue(0);
      mockStorageRepository.existsActiveName.mockResolvedValue(false);
    });

    describe('When the storage name is unique and no icon or color is provided', () => {
      it('Then creates the storage with default icon and color, returning the UUID', async () => {
        const savedAggregate = StorageAggregate.createCustomRoom({
          tenantUUID: TENANT_UUID,
          name: 'New Room',
          roomType: 'Office',
          icon: CUSTOM_ROOM_DEFAULT_ICON,
          color: CUSTOM_ROOM_DEFAULT_COLOR,
          address: '123 Main St',
        });
        jest.spyOn(savedAggregate, 'commit').mockImplementation(() => void 0);
        mockStorageRepository.save.mockResolvedValue(savedAggregate);
        mockEventPublisher.mergeObjectContext.mockReturnValue(savedAggregate as never);

        const command = new CreateCustomRoomCommand(TENANT_UUID, 'New Room', 'Office', '123 Main St');
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().storageUUID).toBe(savedAggregate.uuid);
        expect(mockStorageRepository.save).toHaveBeenCalledTimes(1);
        const createdAggregate = mockStorageRepository.save.mock.calls[0][0];
        expect(createdAggregate.icon).toBe(CUSTOM_ROOM_DEFAULT_ICON);
        expect(createdAggregate.color).toBe(CUSTOM_ROOM_DEFAULT_COLOR);
        expect(savedAggregate.commit).toHaveBeenCalled();
      });
    });

    describe('When the storage name is unique and a custom icon and color are provided', () => {
      it('Then creates the storage with the provided icon and color', async () => {
        const savedAggregate = StorageAggregate.createCustomRoom({
          tenantUUID: TENANT_UUID,
          name: 'Styled Room',
          roomType: 'Kitchen',
          icon: 'kitchen',
          color: '#A855F7',
          address: '99 Custom Blvd',
        });
        jest.spyOn(savedAggregate, 'commit').mockImplementation(() => void 0);
        mockStorageRepository.save.mockResolvedValue(savedAggregate);
        mockEventPublisher.mergeObjectContext.mockReturnValue(savedAggregate as never);

        const command = new CreateCustomRoomCommand(
          TENANT_UUID, 'Styled Room', 'Kitchen', '99 Custom Blvd',
          undefined, undefined, 'kitchen', '#A855F7',
        );
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        const createdAggregate = mockStorageRepository.save.mock.calls[0][0];
        expect(createdAggregate.icon).toBe('kitchen');
        expect(createdAggregate.color).toBe('#A855F7');
      });
    });

    describe('When the storage name already exists', () => {
      it('Then returns StorageNameAlreadyExistsError', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(true);

        const command = new CreateCustomRoomCommand(TENANT_UUID, 'Taken Name', 'Office', '123 St');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
        expect(mockStorageRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant that has reached the custom room limit', () => {
    describe('When create custom room is requested', () => {
      it('Then returns CustomRoomLimitReachedError', async () => {
        mockStorageRepository.countActiveByType.mockResolvedValue(3);
        mockCapabilities.canCreateMoreCustomRooms.mockReturnValue(false);

        const command = new CreateCustomRoomCommand(TENANT_UUID, 'Over Limit', 'Office', '123 St');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(CustomRoomLimitReachedError);
        expect(mockStorageRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});

// ── CreateStoreRoomHandler ──────────────────────────────────────────────────────

describe('CreateStoreRoomHandler', () => {
  let handler: CreateStoreRoomHandler;

  beforeEach(() => {
    handler = new CreateStoreRoomHandler(
      mockStorageRepository,
      mockCapabilitiesPort,
      mockEventPublisher,
    );
  });

  describe('Given a tenant with available store room capacity', () => {
    beforeEach(() => {
      mockStorageRepository.countActiveByType.mockResolvedValue(1);
      mockStorageRepository.existsActiveName.mockResolvedValue(false);
    });

    describe('When the storage name is unique', () => {
      it('Then creates and saves the storage with fixed store room icon and color, returning the UUID', async () => {
        const savedAggregate = StorageAggregate.createStoreRoom({
          tenantUUID: TENANT_UUID,
          name: 'New Bodega',
          icon: STORE_ROOM_DEFAULT_ICON,
          color: STORE_ROOM_DEFAULT_COLOR,
          address: '456 Ave',
        });
        jest.spyOn(savedAggregate, 'commit').mockImplementation(() => void 0);
        mockStorageRepository.save.mockResolvedValue(savedAggregate);
        mockEventPublisher.mergeObjectContext.mockReturnValue(savedAggregate as never);

        const command = new CreateStoreRoomCommand(TENANT_UUID, 'New Bodega', '456 Ave');
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().storageUUID).toBe(savedAggregate.uuid);
        const createdAggregate = mockStorageRepository.save.mock.calls[0][0];
        expect(createdAggregate.icon).toBe(STORE_ROOM_DEFAULT_ICON);
        expect(createdAggregate.color).toBe(STORE_ROOM_DEFAULT_COLOR);
      });
    });

    describe('When the storage name already exists', () => {
      it('Then returns StorageNameAlreadyExistsError', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(true);

        const command = new CreateStoreRoomCommand(TENANT_UUID, 'Taken Name', '123 St');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
      });
    });
  });

  describe('Given a tenant that has reached the store room limit', () => {
    describe('When create store room is requested', () => {
      it('Then returns StoreRoomLimitReachedError', async () => {
        mockStorageRepository.countActiveByType.mockResolvedValue(5);
        mockCapabilities.canCreateMoreStoreRooms.mockReturnValue(false);

        const command = new CreateStoreRoomCommand(TENANT_UUID, 'Over Limit', '123 St');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StoreRoomLimitReachedError);
      });
    });
  });
});

// ── CreateWarehouseHandler ──────────────────────────────────────────────────────

describe('CreateWarehouseHandler', () => {
  let handler: CreateWarehouseHandler;

  beforeEach(() => {
    handler = new CreateWarehouseHandler(
      mockStorageRepository,
      mockCapabilitiesPort,
      mockEventPublisher,
    );
  });

  describe('Given a tenant on STARTER tier with warehouse capacity', () => {
    beforeEach(() => {
      mockStorageRepository.countActiveByType.mockResolvedValue(0);
      mockStorageRepository.existsActiveName.mockResolvedValue(false);
    });

    describe('When the warehouse name is unique', () => {
      it('Then creates and saves the warehouse with fixed icon and color, returning the UUID', async () => {
        const savedAggregate = StorageAggregate.createWarehouse({
          tenantUUID: TENANT_UUID,
          name: 'Main WH',
          icon: WAREHOUSE_DEFAULT_ICON,
          color: WAREHOUSE_DEFAULT_COLOR,
          address: '789 Industrial',
        });
        jest.spyOn(savedAggregate, 'commit').mockImplementation(() => void 0);
        mockStorageRepository.save.mockResolvedValue(savedAggregate);
        mockEventPublisher.mergeObjectContext.mockReturnValue(savedAggregate as never);

        const command = new CreateWarehouseCommand(TENANT_UUID, 'Main WH', '789 Industrial');
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().storageUUID).toBe(savedAggregate.uuid);
        const createdAggregate = mockStorageRepository.save.mock.calls[0][0];
        expect(createdAggregate.icon).toBe(WAREHOUSE_DEFAULT_ICON);
        expect(createdAggregate.color).toBe(WAREHOUSE_DEFAULT_COLOR);
      });
    });

    describe('When the warehouse name already exists', () => {
      it('Then returns StorageNameAlreadyExistsError', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(true);

        const command = new CreateWarehouseCommand(TENANT_UUID, 'Taken WH', '123 St');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
      });
    });
  });

  describe('Given a tenant on FREE tier', () => {
    describe('When warehouse creation is attempted', () => {
      it('Then returns WarehouseRequiresTierUpgradeError', async () => {
        mockCapabilities.canCreateWarehouse.mockReturnValue(false);

        const command = new CreateWarehouseCommand(TENANT_UUID, 'WH', '123 St');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
        expect(mockStorageRepository.countActiveByType).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant that has reached the warehouse limit', () => {
    describe('When warehouse creation is attempted', () => {
      it('Then returns WarehouseRequiresTierUpgradeError', async () => {
        mockStorageRepository.countActiveByType.mockResolvedValue(3);
        mockCapabilities.canCreateMoreWarehouses.mockReturnValue(false);

        const command = new CreateWarehouseCommand(TENANT_UUID, 'Over Limit WH', '123 St');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
      });
    });
  });
});

// ── UpdateCustomRoomHandler ─────────────────────────────────────────────────────

describe('UpdateCustomRoomHandler', () => {
  let handler: UpdateCustomRoomHandler;

  beforeEach(() => {
    handler = new UpdateCustomRoomHandler(mockStorageRepository, mockEventPublisher);
  });

  describe('Given a custom room storage that exists and is active', () => {
    let existing: StorageAggregate;

    beforeEach(() => {
      existing = makeCustomRoomAggregate();
      mockStorageRepository.findByUUID.mockResolvedValue(existing);
    });

    describe('When updating with a new unique name', () => {
      it('Then updates the storage and returns the UUID', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(false);
        const saved = makeCustomRoomAggregate();
        jest.spyOn(saved, 'commit').mockImplementation(() => void 0);
        mockStorageRepository.save.mockResolvedValue(saved);
        mockEventPublisher.mergeObjectContext.mockReturnValue(saved as never);

        const command = new UpdateCustomRoomCommand(STORAGE_UUID, TENANT_UUID, 'Updated Name');
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockStorageRepository.existsActiveName).toHaveBeenCalledWith(TENANT_UUID, 'Updated Name');
      });
    });

    describe('When updating with the same name', () => {
      it('Then skips the name uniqueness check and updates successfully', async () => {
        const saved = makeCustomRoomAggregate();
        jest.spyOn(saved, 'commit').mockImplementation(() => void 0);
        mockStorageRepository.save.mockResolvedValue(saved);
        mockEventPublisher.mergeObjectContext.mockReturnValue(saved as never);

        const command = new UpdateCustomRoomCommand(STORAGE_UUID, TENANT_UUID, 'Existing Room');
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockStorageRepository.existsActiveName).not.toHaveBeenCalled();
      });
    });

    describe('When no name is provided', () => {
      it('Then skips the name uniqueness check', async () => {
        const saved = makeCustomRoomAggregate();
        jest.spyOn(saved, 'commit').mockImplementation(() => void 0);
        mockStorageRepository.save.mockResolvedValue(saved);
        mockEventPublisher.mergeObjectContext.mockReturnValue(saved as never);

        const command = new UpdateCustomRoomCommand(STORAGE_UUID, TENANT_UUID, undefined, 'New desc');
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockStorageRepository.existsActiveName).not.toHaveBeenCalled();
      });
    });

    describe('When updating with a name that already exists', () => {
      it('Then returns StorageNameAlreadyExistsError', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(true);

        const command = new UpdateCustomRoomCommand(STORAGE_UUID, TENANT_UUID, 'Taken Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
      });
    });
  });

  describe('Given the storage UUID does not exist', () => {
    describe('When update is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        mockStorageRepository.findByUUID.mockResolvedValue(null);

        const command = new UpdateCustomRoomCommand(STORAGE_UUID, TENANT_UUID, 'Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the storage is of a different type (STORE_ROOM)', () => {
    describe('When update custom room is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        mockStorageRepository.findByUUID.mockResolvedValue(makeStoreRoomAggregate());

        const command = new UpdateCustomRoomCommand(STORAGE_UUID, TENANT_UUID, 'Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the custom room storage is archived', () => {
    describe('When update is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        mockStorageRepository.findByUUID.mockResolvedValue(makeCustomRoomAggregate(new Date()));

        const command = new UpdateCustomRoomCommand(STORAGE_UUID, TENANT_UUID, 'Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });
});

// ── UpdateStoreRoomHandler ──────────────────────────────────────────────────────

describe('UpdateStoreRoomHandler', () => {
  let handler: UpdateStoreRoomHandler;

  beforeEach(() => {
    handler = new UpdateStoreRoomHandler(mockStorageRepository, mockEventPublisher);
  });

  describe('Given a store room storage that exists and is active', () => {
    beforeEach(() => {
      mockStorageRepository.findByUUID.mockResolvedValue(makeStoreRoomAggregate());
    });

    describe('When updating with a new unique name', () => {
      it('Then updates the storage and returns the UUID', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(false);
        const saved = makeStoreRoomAggregate();
        jest.spyOn(saved, 'commit').mockImplementation(() => void 0);
        mockStorageRepository.save.mockResolvedValue(saved);
        mockEventPublisher.mergeObjectContext.mockReturnValue(saved as never);

        const command = new UpdateStoreRoomCommand(STORAGE_UUID, TENANT_UUID, 'New Store Name');
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
      });
    });

    describe('When updating with a name that already exists', () => {
      it('Then returns StorageNameAlreadyExistsError', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(true);

        const command = new UpdateStoreRoomCommand(STORAGE_UUID, TENANT_UUID, 'Taken');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
      });
    });
  });

  describe('Given the storage does not exist', () => {
    describe('When update store room is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        mockStorageRepository.findByUUID.mockResolvedValue(null);

        const command = new UpdateStoreRoomCommand(STORAGE_UUID, TENANT_UUID, 'Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the storage is of a different type (CUSTOM_ROOM)', () => {
    describe('When update store room is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        mockStorageRepository.findByUUID.mockResolvedValue(makeCustomRoomAggregate());

        const command = new UpdateStoreRoomCommand(STORAGE_UUID, TENANT_UUID, 'Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the store room storage is archived', () => {
    describe('When update is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        mockStorageRepository.findByUUID.mockResolvedValue(makeStoreRoomAggregate(new Date()));

        const command = new UpdateStoreRoomCommand(STORAGE_UUID, TENANT_UUID, 'Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });
});

// ── UpdateWarehouseHandler ──────────────────────────────────────────────────────

describe('UpdateWarehouseHandler', () => {
  let handler: UpdateWarehouseHandler;

  beforeEach(() => {
    handler = new UpdateWarehouseHandler(mockStorageRepository, mockEventPublisher);
  });

  describe('Given a warehouse storage that exists and is active', () => {
    beforeEach(() => {
      mockStorageRepository.findByUUID.mockResolvedValue(makeWarehouseAggregate());
    });

    describe('When updating with a new unique name', () => {
      it('Then updates the warehouse and returns the UUID', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(false);
        const saved = makeWarehouseAggregate();
        jest.spyOn(saved, 'commit').mockImplementation(() => void 0);
        mockStorageRepository.save.mockResolvedValue(saved);
        mockEventPublisher.mergeObjectContext.mockReturnValue(saved as never);

        const command = new UpdateWarehouseCommand(STORAGE_UUID, TENANT_UUID, 'New WH Name');
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
      });
    });

    describe('When updating with a name that already exists', () => {
      it('Then returns StorageNameAlreadyExistsError', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(true);

        const command = new UpdateWarehouseCommand(STORAGE_UUID, TENANT_UUID, 'Taken WH');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
      });
    });
  });

  describe('Given the storage does not exist', () => {
    describe('When update warehouse is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        mockStorageRepository.findByUUID.mockResolvedValue(null);

        const command = new UpdateWarehouseCommand(STORAGE_UUID, TENANT_UUID, 'Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the storage is of a different type (STORE_ROOM)', () => {
    describe('When update warehouse is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        mockStorageRepository.findByUUID.mockResolvedValue(makeStoreRoomAggregate());

        const command = new UpdateWarehouseCommand(STORAGE_UUID, TENANT_UUID, 'Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the warehouse storage is archived', () => {
    describe('When update is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        mockStorageRepository.findByUUID.mockResolvedValue(makeWarehouseAggregate(new Date()));

        const command = new UpdateWarehouseCommand(STORAGE_UUID, TENANT_UUID, 'Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });
});

// ── ArchiveStorageHandler ───────────────────────────────────────────────────────

describe('ArchiveStorageHandler', () => {
  let handler: ArchiveStorageHandler;

  beforeEach(() => {
    handler = new ArchiveStorageHandler(mockStorageRepository, mockEventPublisher);
  });

  describe('Given an active storage', () => {
    describe('When archive is requested', () => {
      it('Then archives the storage and returns ok(undefined)', async () => {
        const existing = makeCustomRoomAggregate();
        jest.spyOn(existing, 'commit').mockImplementation(() => void 0);
        mockStorageRepository.findByUUID.mockResolvedValue(existing);
        mockStorageRepository.archive.mockResolvedValue(undefined);
        mockEventPublisher.mergeObjectContext.mockReturnValue(existing as never);

        const command = new ArchiveStorageCommand(STORAGE_UUID, TENANT_UUID);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toBeUndefined();
        expect(mockStorageRepository.archive).toHaveBeenCalledWith(existing);
        expect(existing.isArchived()).toBe(true);
        expect(existing.commit).toHaveBeenCalled();
      });
    });
  });

  describe('Given the storage does not exist', () => {
    describe('When archive is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        mockStorageRepository.findByUUID.mockResolvedValue(null);

        const command = new ArchiveStorageCommand(STORAGE_UUID, TENANT_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
        expect(mockStorageRepository.archive).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the storage is already archived', () => {
    describe('When archive is requested again', () => {
      it('Then returns StorageAlreadyArchivedError', async () => {
        mockStorageRepository.findByUUID.mockResolvedValue(makeCustomRoomAggregate(new Date()));

        const command = new ArchiveStorageCommand(STORAGE_UUID, TENANT_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyArchivedError);
        expect(mockStorageRepository.archive).not.toHaveBeenCalled();
      });
    });
  });
});

// ── GetStorageHandler ───────────────────────────────────────────────────────────

describe('GetStorageHandler', () => {
  let handler: GetStorageHandler;

  beforeEach(() => {
    handler = new GetStorageHandler(mockStorageRepository);
  });

  describe('Given a storage that exists', () => {
    describe('When the storage UUID and tenant UUID match', () => {
      it('Then returns the storage aggregate', async () => {
        const existing = makeCustomRoomAggregate();
        mockStorageRepository.findByUUID.mockResolvedValue(existing);

        const query = new GetStorageQuery(STORAGE_UUID, TENANT_UUID);
        const result = await handler.execute(query);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toBe(existing);
        expect(mockStorageRepository.findByUUID).toHaveBeenCalledWith(STORAGE_UUID, TENANT_UUID);
      });
    });
  });

  describe('Given the storage does not exist for the tenant', () => {
    describe('When get is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        mockStorageRepository.findByUUID.mockResolvedValue(null);

        const query = new GetStorageQuery(STORAGE_UUID, TENANT_UUID);
        const result = await handler.execute(query);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });
});

// ── ListStoragesHandler ─────────────────────────────────────────────────────────

describe('ListStoragesHandler', () => {
  let handler: ListStoragesHandler;

  beforeEach(() => {
    handler = new ListStoragesHandler(mockStorageRepository);
  });

  describe('Given a tenant with storages', () => {
    describe('When list is requested with filters and pagination', () => {
      it('Then delegates to the repository and returns the page', async () => {
        const page = { items: [makeCustomRoomAggregate()], total: 1 };
        mockStorageRepository.findAll.mockResolvedValue(page);

        const query = new ListStoragesQuery(
          TENANT_UUID,
          { status: StorageStatus.ACTIVE, type: StorageType.CUSTOM_ROOM },
          { page: 1, limit: 50 },
          'ASC',
          'Office',
        );
        const result = await handler.execute(query);

        expect(result).toEqual(page);
        expect(mockStorageRepository.findAll).toHaveBeenCalledWith(
          TENANT_UUID,
          { status: StorageStatus.ACTIVE, type: StorageType.CUSTOM_ROOM },
          { page: 1, limit: 50 },
          'Office',
          'ASC',
        );
      });
    });

    describe('When list is requested without filters', () => {
      it('Then delegates to the repository with undefined filters', async () => {
        const page = { items: [], total: 0 };
        mockStorageRepository.findAll.mockResolvedValue(page);

        const query = new ListStoragesQuery(TENANT_UUID, undefined, { page: 1, limit: 50 }, 'DESC');
        const result = await handler.execute(query);

        expect(result).toEqual(page);
        expect(mockStorageRepository.findAll).toHaveBeenCalledWith(
          TENANT_UUID,
          undefined,
          { page: 1, limit: 50 },
          undefined,
          'DESC',
        );
      });
    });
  });
});
