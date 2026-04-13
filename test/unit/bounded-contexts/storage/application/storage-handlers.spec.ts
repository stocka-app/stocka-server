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
import { ChangeStorageTypeHandler } from '@storage/application/commands/change-storage-type/change-storage-type.handler';
import { ChangeStorageTypeCommand } from '@storage/application/commands/change-storage-type/change-storage-type.command';
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
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import {
  ITenantCapabilitiesPort,
  TenantCapabilities,
} from '@storage/application/ports/tenant-capabilities.port';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageAlreadyArchivedError } from '@storage/domain/errors/storage-already-archived.error';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { StorageArchivedCannotBeUpdatedError } from '@storage/domain/errors/storage-archived-cannot-be-updated.error';
import { StorageTypeLockedWhileFrozenError } from '@storage/domain/errors/storage-type-locked-while-frozen.error';
import { StorageAddressRequiredForWarehouseError } from '@storage/domain/errors/storage-address-required-for-warehouse.error';
import { StorageAlreadyFrozenError } from '@storage/domain/errors/storage-already-frozen.error';
import { StorageNotFrozenError } from '@storage/domain/errors/storage-not-frozen.error';
import { StorageArchivedCannotBeFrozenError } from '@storage/domain/errors/storage-archived-cannot-be-frozen.error';
import { CustomRoomLimitReachedError } from '@storage/application/errors/custom-room-limit-reached.error';
import { StoreRoomLimitReachedError } from '@storage/application/errors/store-room-limit-reached.error';
import { WarehouseRequiresTierUpgradeError } from '@storage/application/errors/warehouse-requires-tier-upgrade.error';
import { FreezeWarehouseHandler } from '@storage/application/commands/freeze-warehouse/freeze-warehouse.handler';
import { FreezeWarehouseCommand } from '@storage/application/commands/freeze-warehouse/freeze-warehouse.command';
import { FreezeStoreRoomHandler } from '@storage/application/commands/freeze-store-room/freeze-store-room.handler';
import { FreezeStoreRoomCommand } from '@storage/application/commands/freeze-store-room/freeze-store-room.command';
import { FreezeCustomRoomHandler } from '@storage/application/commands/freeze-custom-room/freeze-custom-room.handler';
import { FreezeCustomRoomCommand } from '@storage/application/commands/freeze-custom-room/freeze-custom-room.command';
import { UnfreezeWarehouseHandler } from '@storage/application/commands/unfreeze-warehouse/unfreeze-warehouse.handler';
import { UnfreezeWarehouseCommand } from '@storage/application/commands/unfreeze-warehouse/unfreeze-warehouse.command';
import { UnfreezeStoreRoomHandler } from '@storage/application/commands/unfreeze-store-room/unfreeze-store-room.handler';
import { UnfreezeStoreRoomCommand } from '@storage/application/commands/unfreeze-store-room/unfreeze-store-room.command';
import { UnfreezeCustomRoomHandler } from '@storage/application/commands/unfreeze-custom-room/unfreeze-custom-room.handler';
import { UnfreezeCustomRoomCommand } from '@storage/application/commands/unfreeze-custom-room/unfreeze-custom-room.command';
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeWarehouse(
  uuid: string,
  overrides: Partial<{ archivedAt: Date | null; frozenAt: Date | null }> = {},
): WarehouseModel {
  return WarehouseModel.reconstitute({
    id: 1,
    uuid: new UUIDVO(uuid),
    tenantUUID: TENANT_UUID,
    name: new StorageNameVO('Existing WH'),
    description: null,
    icon: new StorageIconVO('warehouse'),
    color: new StorageColorVO('#3b82f6'),
    address: new StorageAddressVO('789 Industrial'),
    archivedAt: overrides.archivedAt ?? null,
    frozenAt: overrides.frozenAt ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeStoreRoom(
  uuid: string,
  overrides: Partial<{ archivedAt: Date | null; frozenAt: Date | null }> = {},
): StoreRoomModel {
  return StoreRoomModel.reconstitute({
    id: 2,
    uuid: new UUIDVO(uuid),
    tenantUUID: TENANT_UUID,
    name: new StorageNameVO('Existing Store'),
    description: null,
    icon: new StorageIconVO('inventory_2'),
    color: new StorageColorVO('#d97706'),
    address: new StorageAddressVO('456 Oak Ave'),
    archivedAt: overrides.archivedAt ?? null,
    frozenAt: overrides.frozenAt ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeCustomRoom(
  uuid: string,
  overrides: Partial<{ archivedAt: Date | null; frozenAt: Date | null }> = {},
): CustomRoomModel {
  return CustomRoomModel.reconstitute({
    id: 3,
    uuid: new UUIDVO(uuid),
    tenantUUID: TENANT_UUID,
    name: StorageNameVO.create('Existing Room'),
    description: null,
    icon: StorageIconVO.create('other_houses'),
    color: StorageColorVO.create('#6b7280'),
    roomType: RoomTypeNameVO.create('Office'),
    address: StorageAddressVO.create('123 Main St'),
    archivedAt: overrides.archivedAt ?? null,
    frozenAt: overrides.frozenAt ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeAggregate(
  opts: {
    warehouses?: WarehouseModel[];
    storeRooms?: StoreRoomModel[];
    customRooms?: CustomRoomModel[];
  } = {},
): StorageAggregate {
  return StorageAggregate.reconstitute({
    id: 42,
    uuid: '019538a0-0000-7000-8000-000000000099',
    tenantUUID: TENANT_UUID,
    warehouses: opts.warehouses ?? [],
    storeRooms: opts.storeRooms ?? [],
    customRooms: opts.customRooms ?? [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// ── Shared mocks ────────────────────────────────────────────────────────────────

let mockStorageRepository: jest.Mocked<IStorageRepository>;
let mockWarehouseRepository: jest.Mocked<IWarehouseRepository>;
let mockStoreRoomRepository: jest.Mocked<IStoreRoomRepository>;
let mockCustomRoomRepository: jest.Mocked<ICustomRoomRepository>;
let mockCapabilitiesPort: jest.Mocked<ITenantCapabilitiesPort>;
let mockEventPublisher: jest.Mocked<EventPublisher>;
let mockCapabilities: jest.Mocked<TenantCapabilities>;

beforeEach(() => {
  mockStorageRepository = {
    findOrCreate: jest.fn(),
    existsActiveName: jest.fn(),
  };

  mockWarehouseRepository = {
    count: jest.fn(),
    save: jest.fn(),
    deleteByUUID: jest.fn(),
  };

  mockStoreRoomRepository = {
    count: jest.fn(),
    save: jest.fn(),
    deleteByUUID: jest.fn(),
  };

  mockCustomRoomRepository = {
    count: jest.fn(),
    save: jest.fn(),
    deleteByUUID: jest.fn(),
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
      mockCustomRoomRepository,
      mockCapabilitiesPort,
      mockEventPublisher,
    );
  });

  describe('Given a tenant with available custom room capacity', () => {
    beforeEach(() => {
      mockCustomRoomRepository.count.mockResolvedValue(0);
      mockStorageRepository.existsActiveName.mockResolvedValue(false);
      const aggregate = makeAggregate();
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockCustomRoomRepository.save.mockImplementation(async (model) => model);
    });

    describe('When the storage name is unique and no icon or color is provided', () => {
      it('Then creates the custom room with default icon and color, returning the UUID', async () => {
        const command = new CreateCustomRoomCommand(
          TENANT_UUID,
          'New Room',
          'Office',
          '123 Main St',
          ACTOR_UUID,
        );
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().storageUUID).toBeDefined();
        expect(mockCustomRoomRepository.save).toHaveBeenCalledTimes(1);
        const savedModel = mockCustomRoomRepository.save.mock.calls[0][0];
        expect(savedModel.icon.getValue()).toBe(CUSTOM_ROOM_DEFAULT_ICON);
        expect(savedModel.color.getValue()).toBe(CUSTOM_ROOM_DEFAULT_COLOR);
      });
    });

    describe('When the storage name is unique and a custom icon and color are provided', () => {
      it('Then creates the custom room with the provided icon and color', async () => {
        const command = new CreateCustomRoomCommand(
          TENANT_UUID,
          'Styled Room',
          'Kitchen',
          '99 Custom Blvd',
          ACTOR_UUID,
          undefined,
          'kitchen',
          '#A855F7',
        );
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        const savedModel = mockCustomRoomRepository.save.mock.calls[0][0];
        expect(savedModel.icon.getValue()).toBe('kitchen');
        expect(savedModel.color.getValue()).toBe('#A855F7');
      });
    });

    describe('When the storage name already exists', () => {
      it('Then returns StorageNameAlreadyExistsError', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(true);

        const command = new CreateCustomRoomCommand(
          TENANT_UUID,
          'Taken Name',
          'Office',
          '123 St',
          ACTOR_UUID,
        );
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
        expect(mockCustomRoomRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant that has reached the custom room limit', () => {
    describe('When create custom room is requested', () => {
      it('Then returns CustomRoomLimitReachedError', async () => {
        mockCustomRoomRepository.count.mockResolvedValue(3);
        mockCapabilities.canCreateMoreCustomRooms.mockReturnValue(false);

        const command = new CreateCustomRoomCommand(
          TENANT_UUID,
          'Over Limit',
          'Office',
          '123 St',
          ACTOR_UUID,
        );
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(CustomRoomLimitReachedError);
        expect(mockCustomRoomRepository.save).not.toHaveBeenCalled();
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
      mockStoreRoomRepository,
      mockCapabilitiesPort,
      mockEventPublisher,
    );
  });

  describe('Given a tenant with available store room capacity', () => {
    beforeEach(() => {
      mockStoreRoomRepository.count.mockResolvedValue(1);
      mockStorageRepository.existsActiveName.mockResolvedValue(false);
      const aggregate = makeAggregate();
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockStoreRoomRepository.save.mockImplementation(async (model) => model);
    });

    describe('When the storage name is unique', () => {
      it('Then creates and saves the store room with fixed icon and color, returning the UUID', async () => {
        const command = new CreateStoreRoomCommand(
          TENANT_UUID,
          'New Bodega',
          '456 Ave',
          ACTOR_UUID,
        );
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().storageUUID).toBeDefined();
        const savedModel = mockStoreRoomRepository.save.mock.calls[0][0];
        expect(savedModel.icon.getValue()).toBe(STORE_ROOM_DEFAULT_ICON);
        expect(savedModel.color.getValue()).toBe(STORE_ROOM_DEFAULT_COLOR);
      });
    });

    describe('When the storage name already exists', () => {
      it('Then returns StorageNameAlreadyExistsError', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(true);

        const command = new CreateStoreRoomCommand(TENANT_UUID, 'Taken Name', '123 St', ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
      });
    });
  });

  describe('Given a tenant that has reached the store room limit', () => {
    describe('When create store room is requested', () => {
      it('Then returns StoreRoomLimitReachedError', async () => {
        mockStoreRoomRepository.count.mockResolvedValue(5);
        mockCapabilities.canCreateMoreStoreRooms.mockReturnValue(false);

        const command = new CreateStoreRoomCommand(TENANT_UUID, 'Over Limit', '123 St', ACTOR_UUID);
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
      mockWarehouseRepository,
      mockCapabilitiesPort,
      mockEventPublisher,
    );
  });

  describe('Given a tenant on STARTER tier with warehouse capacity', () => {
    beforeEach(() => {
      mockWarehouseRepository.count.mockResolvedValue(0);
      mockStorageRepository.existsActiveName.mockResolvedValue(false);
      const aggregate = makeAggregate();
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockWarehouseRepository.save.mockImplementation(async (model) => model);
    });

    describe('When the warehouse name is unique', () => {
      it('Then creates and saves the warehouse with fixed icon and color, returning the UUID', async () => {
        const command = new CreateWarehouseCommand(
          TENANT_UUID,
          'Main WH',
          '789 Industrial',
          ACTOR_UUID,
        );
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().storageUUID).toBeDefined();
        const savedModel = mockWarehouseRepository.save.mock.calls[0][0];
        expect(savedModel.icon.getValue()).toBe(WAREHOUSE_DEFAULT_ICON);
        expect(savedModel.color.getValue()).toBe(WAREHOUSE_DEFAULT_COLOR);
      });
    });

    describe('When the warehouse name already exists', () => {
      it('Then returns StorageNameAlreadyExistsError', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(true);

        const command = new CreateWarehouseCommand(TENANT_UUID, 'Taken WH', '123 St', ACTOR_UUID);
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

        const command = new CreateWarehouseCommand(TENANT_UUID, 'WH', '123 St', ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
        expect(mockWarehouseRepository.count).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant that has reached the warehouse limit', () => {
    describe('When warehouse creation is attempted', () => {
      it('Then returns WarehouseRequiresTierUpgradeError', async () => {
        mockWarehouseRepository.count.mockResolvedValue(3);
        mockCapabilities.canCreateMoreWarehouses.mockReturnValue(false);

        const command = new CreateWarehouseCommand(
          TENANT_UUID,
          'Over Limit WH',
          '123 St',
          ACTOR_UUID,
        );
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
    handler = new UpdateCustomRoomHandler(
      mockStorageRepository,
      mockCustomRoomRepository,
      mockEventPublisher,
    );
  });

  describe('Given a custom room that exists and is active', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({ customRooms: [makeCustomRoom(CR_UUID)] });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockCustomRoomRepository.save.mockImplementation(async (model) => model);
    });

    describe('When updating with a new unique name', () => {
      it('Then updates the custom room and returns the UUID', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(false);

        const command = new UpdateCustomRoomCommand(
          CR_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          'Updated Name',
        );
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().storageUUID).toBe(CR_UUID);
        expect(mockStorageRepository.existsActiveName).toHaveBeenCalledWith(
          TENANT_UUID,
          'Updated Name',
        );
      });
    });

    describe('When updating with the same name', () => {
      it('Then skips the name uniqueness check and updates successfully', async () => {
        const command = new UpdateCustomRoomCommand(
          CR_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          'Existing Room',
        );
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockStorageRepository.existsActiveName).not.toHaveBeenCalled();
      });
    });

    describe('When no name is provided', () => {
      it('Then skips the name uniqueness check', async () => {
        const command = new UpdateCustomRoomCommand(
          CR_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          undefined,
          'New desc',
        );
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockStorageRepository.existsActiveName).not.toHaveBeenCalled();
      });
    });

    describe('When updating with a name that already exists', () => {
      it('Then returns StorageNameAlreadyExistsError', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(true);

        const command = new UpdateCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, 'Taken Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
      });
    });
  });

  describe('Given the custom room UUID does not exist in the aggregate', () => {
    describe('When update is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        const aggregate = makeAggregate();
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);

        const command = new UpdateCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, 'Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the custom room is archived', () => {
    describe('When update is requested', () => {
      it('Then returns StorageArchivedCannotBeUpdatedError', async () => {
        const aggregate = makeAggregate({
          customRooms: [makeCustomRoom(CR_UUID, { archivedAt: new Date() })],
        });
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);

        const command = new UpdateCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, 'Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageArchivedCannotBeUpdatedError);
      });
    });
  });

  describe('Given the aggregate has no persisted id', () => {
    describe('When update is requested', () => {
      it('Then returns StorageNotFoundError as a safety guard', async () => {
        const aggregate = StorageAggregate.reconstitute({
          id: undefined as unknown as number,
          uuid: '019538a0-0000-7000-8000-000000000099',
          tenantUUID: TENANT_UUID,
          warehouses: [],
          storeRooms: [],
          customRooms: [makeCustomRoom(CR_UUID)],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);

        const command = new UpdateCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, 'New Name');
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
    handler = new UpdateStoreRoomHandler(
      mockStorageRepository,
      mockStoreRoomRepository,
      mockEventPublisher,
    );
  });

  describe('Given a store room that exists and is active', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({ storeRooms: [makeStoreRoom(SR_UUID)] });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockStoreRoomRepository.save.mockImplementation(async (model) => model);
    });

    describe('When updating with a new unique name', () => {
      it('Then updates the store room and returns the UUID', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(false);

        const command = new UpdateStoreRoomCommand(
          SR_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          'New Store Name',
        );
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
      });
    });

    describe('When updating with a name that already exists', () => {
      it('Then returns StorageNameAlreadyExistsError', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(true);

        const command = new UpdateStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, 'Taken');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
      });
    });

    describe('When updating with the same name as the current one', () => {
      it('Then skips the name uniqueness check and updates successfully', async () => {
        const command = new UpdateStoreRoomCommand(
          SR_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          'Existing Store',
        );
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockStorageRepository.existsActiveName).not.toHaveBeenCalled();
      });
    });

    describe('When no name is provided', () => {
      it('Then skips the name uniqueness check and updates successfully', async () => {
        const command = new UpdateStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, undefined);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockStorageRepository.existsActiveName).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the store room does not exist in the aggregate', () => {
    describe('When update store room is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        const aggregate = makeAggregate();
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);

        const command = new UpdateStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, 'Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the store room is archived', () => {
    describe('When update is requested', () => {
      it('Then returns StorageArchivedCannotBeUpdatedError', async () => {
        const aggregate = makeAggregate({
          storeRooms: [makeStoreRoom(SR_UUID, { archivedAt: new Date() })],
        });
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);

        const command = new UpdateStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, 'Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageArchivedCannotBeUpdatedError);
      });
    });
  });

  describe('Given the aggregate has no persisted id', () => {
    describe('When update is requested', () => {
      it('Then returns StorageNotFoundError as a safety guard', async () => {
        const aggregate = StorageAggregate.reconstitute({
          id: undefined as unknown as number,
          uuid: '019538a0-0000-7000-8000-000000000099',
          tenantUUID: TENANT_UUID,
          warehouses: [],
          storeRooms: [makeStoreRoom(SR_UUID)],
          customRooms: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);

        const command = new UpdateStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, 'New Name');
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
    handler = new UpdateWarehouseHandler(
      mockStorageRepository,
      mockWarehouseRepository,
      mockEventPublisher,
    );
  });

  describe('Given a warehouse that exists and is active', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({ warehouses: [makeWarehouse(WH_UUID)] });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockWarehouseRepository.save.mockImplementation(async (model) => model);
    });

    describe('When updating with a new unique name', () => {
      it('Then updates the warehouse and returns the UUID', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(false);

        const command = new UpdateWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, 'New WH Name');
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
      });
    });

    describe('When updating with a name that already exists', () => {
      it('Then returns StorageNameAlreadyExistsError', async () => {
        mockStorageRepository.existsActiveName.mockResolvedValue(true);

        const command = new UpdateWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, 'Taken WH');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
      });
    });

    describe('When updating with the same name as the current one', () => {
      it('Then skips the name uniqueness check and updates successfully', async () => {
        const command = new UpdateWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, 'Existing WH');
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockStorageRepository.existsActiveName).not.toHaveBeenCalled();
      });
    });

    describe('When no name is provided', () => {
      it('Then skips the name uniqueness check and updates successfully', async () => {
        const command = new UpdateWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, undefined);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockStorageRepository.existsActiveName).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the warehouse does not exist in the aggregate', () => {
    describe('When update warehouse is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        const aggregate = makeAggregate();
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);

        const command = new UpdateWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, 'Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the warehouse is archived', () => {
    describe('When update is requested', () => {
      it('Then returns StorageArchivedCannotBeUpdatedError', async () => {
        const aggregate = makeAggregate({
          warehouses: [makeWarehouse(WH_UUID, { archivedAt: new Date() })],
        });
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);

        const command = new UpdateWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, 'Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageArchivedCannotBeUpdatedError);
      });
    });
  });

  describe('Given the aggregate has no persisted id', () => {
    describe('When update is requested', () => {
      it('Then returns StorageNotFoundError as a safety guard', async () => {
        const aggregate = StorageAggregate.reconstitute({
          id: undefined as unknown as number,
          uuid: '019538a0-0000-7000-8000-000000000099',
          tenantUUID: TENANT_UUID,
          warehouses: [makeWarehouse(WH_UUID)],
          storeRooms: [],
          customRooms: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);

        const command = new UpdateWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, 'New Name');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given a warehouse with an empty address update', () => {
    describe('When address is sent as empty string', () => {
      it('Then returns StorageAddressRequiredForWarehouseError', async () => {
        const aggregate = makeAggregate({
          warehouses: [makeWarehouse(WH_UUID)],
        });
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);

        const command = new UpdateWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, undefined, undefined, '  ');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
      });
    });
  });
});

// ── ArchiveStorageHandler ───────────────────────────────────────────────────────

describe('ArchiveStorageHandler', () => {
  let handler: ArchiveStorageHandler;

  beforeEach(() => {
    handler = new ArchiveStorageHandler(
      mockStorageRepository,
      mockWarehouseRepository,
      mockStoreRoomRepository,
      mockCustomRoomRepository,
      mockEventPublisher,
    );
  });

  describe('Given an active warehouse', () => {
    describe('When archive is requested', () => {
      it('Then archives the warehouse and returns ok(undefined)', async () => {
        const aggregate = makeAggregate({ warehouses: [makeWarehouse(WH_UUID)] });
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
        mockWarehouseRepository.save.mockImplementation(async (model) => model);

        const command = new ArchiveStorageCommand(WH_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toBeUndefined();
        expect(mockWarehouseRepository.save).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given an active store room', () => {
    describe('When archive is requested', () => {
      it('Then archives the store room via storeRoomRepository', async () => {
        const aggregate = makeAggregate({ storeRooms: [makeStoreRoom(SR_UUID)] });
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
        mockStoreRoomRepository.save.mockImplementation(async (model) => model);

        const command = new ArchiveStorageCommand(SR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockStoreRoomRepository.save).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given an active custom room', () => {
    describe('When archive is requested', () => {
      it('Then archives the custom room via customRoomRepository', async () => {
        const aggregate = makeAggregate({ customRooms: [makeCustomRoom(CR_UUID)] });
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
        mockCustomRoomRepository.save.mockImplementation(async (model) => model);

        const command = new ArchiveStorageCommand(CR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockCustomRoomRepository.save).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given the storage does not exist in the aggregate', () => {
    describe('When archive is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        const aggregate = makeAggregate();
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);

        const command = new ArchiveStorageCommand(WH_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the storage is already archived', () => {
    describe('When archive is requested again', () => {
      it('Then returns StorageAlreadyArchivedError', async () => {
        const aggregate = makeAggregate({
          customRooms: [makeCustomRoom(CR_UUID, { archivedAt: new Date() })],
        });
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);

        const command = new ArchiveStorageCommand(CR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyArchivedError);
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

  describe('Given a storage that exists in the aggregate', () => {
    describe('When the storage UUID and tenant UUID match', () => {
      it('Then returns the storage item view', async () => {
        const aggregate = makeAggregate({ customRooms: [makeCustomRoom(CR_UUID)] });
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);

        const query = new GetStorageQuery(CR_UUID, TENANT_UUID);
        const result = await handler.execute(query);

        expect(result.isOk()).toBe(true);
        const view = result._unsafeUnwrap();
        expect(view.uuid).toBe(CR_UUID);
        expect(view.type).toBe(StorageType.CUSTOM_ROOM);
        expect(view.name).toBe('Existing Room');
      });
    });
  });

  describe('Given the storage does not exist for the tenant', () => {
    describe('When get is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        const aggregate = makeAggregate();
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);

        const query = new GetStorageQuery(CR_UUID, TENANT_UUID);
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

  describe('Given a tenant with storages of multiple types and statuses', () => {
    // Aggregate: 1 WH (active) + 1 SR (active) + 1 CR (active) + 1 CR (archived)
    // → full summary: { active: 3, frozen: 0, archived: 1 }
    let aggregate: StorageAggregate;

    beforeEach(() => {
      aggregate = makeAggregate({
        warehouses: [makeWarehouse(WH_UUID)],
        storeRooms: [makeStoreRoom(SR_UUID)],
        customRooms: [
          makeCustomRoom(CR_UUID),
          makeCustomRoom('019538a0-0000-7000-8000-000000000031', { archivedAt: new Date() }),
        ],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When list is requested with ACTIVE status filter', () => {
      it('Then returns only active items, summary reflects full type scope, and typeSummary shows per-type counts', async () => {
        const query = new ListStoragesQuery(
          TENANT_UUID,
          { status: StorageStatus.ACTIVE },
          { page: 1, limit: 50 },
          'ASC',
        );
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(3);
        expect(result.total).toBe(3);
        result.items.forEach((item) => {
          expect(item.archivedAt).toBeNull();
          expect(item.frozenAt).toBeNull();
        });
        // Summary is not filtered by status — shows full tenant counts
        expect(result.summary).toEqual({ active: 3, frozen: 0, archived: 1 });
        // typeSummary is computed from ALL items before any filter
        expect(result.typeSummary.WAREHOUSE).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(result.typeSummary.STORE_ROOM).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(result.typeSummary.CUSTOM_ROOM).toEqual({ active: 1, frozen: 0, archived: 1 });
      });
    });

    describe('When list is requested with ARCHIVED status filter', () => {
      it('Then returns only archived items and typeSummary still reflects all items unfiltered', async () => {
        const query = new ListStoragesQuery(
          TENANT_UUID,
          { status: StorageStatus.ARCHIVED },
          { page: 1, limit: 50 },
          'ASC',
        );
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].archivedAt).not.toBeNull();
        expect(result.summary).toEqual({ active: 3, frozen: 0, archived: 1 });
        // typeSummary unaffected by status filter
        expect(result.typeSummary.WAREHOUSE).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(result.typeSummary.STORE_ROOM).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(result.typeSummary.CUSTOM_ROOM).toEqual({ active: 1, frozen: 0, archived: 1 });
      });
    });

    describe('When list is requested with type=WAREHOUSE filter', () => {
      it('Then returns only warehouse items and typeSummary shows all types regardless of type filter', async () => {
        const query = new ListStoragesQuery(
          TENANT_UUID,
          { type: StorageType.WAREHOUSE },
          { page: 1, limit: 50 },
          'ASC',
        );
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].type).toBe(StorageType.WAREHOUSE);
        // Summary scoped to warehouses only: 1 active, 0 frozen, 0 archived
        expect(result.summary).toEqual({ active: 1, frozen: 0, archived: 0 });
        // typeSummary always reflects ALL items before any filter
        expect(result.typeSummary.WAREHOUSE).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(result.typeSummary.STORE_ROOM).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(result.typeSummary.CUSTOM_ROOM).toEqual({ active: 1, frozen: 0, archived: 1 });
      });
    });

    describe('When list is requested with search term', () => {
      it('Then filters by name and typeSummary reflects full pre-search counts', async () => {
        const query = new ListStoragesQuery(
          TENANT_UUID,
          {},
          { page: 1, limit: 50 },
          'ASC',
          'Existing WH',
        );
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].name).toBe('Existing WH');
        // Summary is computed before search filter
        expect(result.summary).toEqual({ active: 3, frozen: 0, archived: 1 });
        // typeSummary computed from all items before search
        expect(result.typeSummary.WAREHOUSE).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(result.typeSummary.STORE_ROOM).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(result.typeSummary.CUSTOM_ROOM).toEqual({ active: 1, frozen: 0, archived: 1 });
      });
    });

    describe('When list is requested with pagination', () => {
      it('Then returns the correct page and typeSummary covers all items across pages', async () => {
        const query = new ListStoragesQuery(TENANT_UUID, {}, { page: 1, limit: 2 }, 'ASC');
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(4);
        // Summary covers all 4 items, not just the 2 on this page
        expect(result.summary).toEqual({ active: 3, frozen: 0, archived: 1 });
        // typeSummary unaffected by pagination
        expect(result.typeSummary.WAREHOUSE).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(result.typeSummary.STORE_ROOM).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(result.typeSummary.CUSTOM_ROOM).toEqual({ active: 1, frozen: 0, archived: 1 });
      });
    });

    describe('When list is requested with DESC sort order', () => {
      it('Then items are sorted by name descending and typeSummary reflects all items', async () => {
        const query = new ListStoragesQuery(TENANT_UUID, {}, { page: 1, limit: 50 }, 'DESC');
        const result = await handler.execute(query);

        for (let i = 0; i < result.items.length - 1; i++) {
          expect(
            result.items[i].name.localeCompare(result.items[i + 1].name),
          ).toBeGreaterThanOrEqual(0);
        }
        expect(result.summary).toEqual({ active: 3, frozen: 0, archived: 1 });
        expect(result.typeSummary.WAREHOUSE).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(result.typeSummary.STORE_ROOM).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(result.typeSummary.CUSTOM_ROOM).toEqual({ active: 1, frozen: 0, archived: 1 });
      });
    });
  });

  describe('Given a tenant with warehouses in different statuses (active, frozen, archived)', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({
        warehouses: [
          makeWarehouse(WH_UUID),
          makeWarehouse('019538a0-0000-7000-8000-000000000011', { frozenAt: new Date() }),
          makeWarehouse('019538a0-0000-7000-8000-000000000012', { archivedAt: new Date() }),
        ],
        storeRooms: [makeStoreRoom(SR_UUID)],
        customRooms: [],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When list is requested with FROZEN status filter', () => {
      it('Then returns only frozen items and typeSummary reflects all warehouse statuses', async () => {
        const query = new ListStoragesQuery(
          TENANT_UUID,
          { status: StorageStatus.FROZEN },
          { page: 1, limit: 50 },
          'ASC',
        );
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].frozenAt).not.toBeNull();
        // typeSummary: 3 warehouses (active+frozen+archived), 1 store room, 0 custom rooms
        expect(result.typeSummary.WAREHOUSE).toEqual({ active: 1, frozen: 1, archived: 1 });
        expect(result.typeSummary.STORE_ROOM).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(result.typeSummary.CUSTOM_ROOM).toEqual({ active: 0, frozen: 0, archived: 0 });
      });
    });

    describe('When list is requested with type=WAREHOUSE and no status filter', () => {
      it('Then summary reflects all three warehouse statuses and typeSummary covers all types', async () => {
        const query = new ListStoragesQuery(
          TENANT_UUID,
          { type: StorageType.WAREHOUSE },
          { page: 1, limit: 50 },
          'ASC',
        );
        const result = await handler.execute(query);

        expect(result.summary).toEqual({ active: 1, frozen: 1, archived: 1 });
        expect(result.typeSummary.WAREHOUSE).toEqual({ active: 1, frozen: 1, archived: 1 });
        expect(result.typeSummary.STORE_ROOM).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(result.typeSummary.CUSTOM_ROOM).toEqual({ active: 0, frozen: 0, archived: 0 });
      });
    });

    describe('When list is requested with type=WAREHOUSE and status=ACTIVE filter', () => {
      it('Then items are filtered by status but typeSummary still reflects all types unfiltered', async () => {
        const query = new ListStoragesQuery(
          TENANT_UUID,
          { type: StorageType.WAREHOUSE, status: StorageStatus.ACTIVE },
          { page: 1, limit: 50 },
          'ASC',
        );
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(1);
        expect(result.summary).toEqual({ active: 1, frozen: 1, archived: 1 });
        expect(result.typeSummary.WAREHOUSE).toEqual({ active: 1, frozen: 1, archived: 1 });
        expect(result.typeSummary.STORE_ROOM).toEqual({ active: 1, frozen: 0, archived: 0 });
        expect(result.typeSummary.CUSTOM_ROOM).toEqual({ active: 0, frozen: 0, archived: 0 });
      });
    });
  });

  describe('Given a tenant with no storages', () => {
    describe('When list is requested', () => {
      it('Then returns an empty page with zero summary and typeSummary counts', async () => {
        const aggregate = makeAggregate();
        mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);

        const query = new ListStoragesQuery(TENANT_UUID, {}, { page: 1, limit: 50 }, 'ASC');
        const result = await handler.execute(query);

        expect(result.items).toHaveLength(0);
        expect(result.total).toBe(0);
        expect(result.summary).toEqual({ active: 0, frozen: 0, archived: 0 });
        expect(result.typeSummary.WAREHOUSE).toEqual({ active: 0, frozen: 0, archived: 0 });
        expect(result.typeSummary.STORE_ROOM).toEqual({ active: 0, frozen: 0, archived: 0 });
        expect(result.typeSummary.CUSTOM_ROOM).toEqual({ active: 0, frozen: 0, archived: 0 });
      });
    });
  });
});

// ── ChangeStorageTypeHandler ────────────────────────────────────────────────────

describe('ChangeStorageTypeHandler', () => {
  let handler: ChangeStorageTypeHandler;

  beforeEach(() => {
    handler = new ChangeStorageTypeHandler(
      mockStorageRepository,
      mockWarehouseRepository,
      mockStoreRoomRepository,
      mockCustomRoomRepository,
      mockCapabilitiesPort,
      mockEventPublisher,
    );
  });

  // CT-1: custom room → STORE_ROOM (happy path)
  describe('Given an active custom room', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({ customRooms: [makeCustomRoom(CR_UUID)] });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockCustomRoomRepository.deleteByUUID.mockResolvedValue(undefined);
      mockStoreRoomRepository.count.mockResolvedValue(0);
      mockStoreRoomRepository.save.mockImplementation(async (model) => model);
    });

    describe('When the type is changed to STORE_ROOM', () => {
      it('Then deletes the custom room, creates a store room, and returns ok with the storage UUID', async () => {
        const command = new ChangeStorageTypeCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, StorageType.STORE_ROOM);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().storageUUID).toBe(CR_UUID);
        expect(mockCustomRoomRepository.deleteByUUID).toHaveBeenCalledWith(CR_UUID);
        expect(mockStoreRoomRepository.save).toHaveBeenCalledTimes(1);
      });
    });

    // CT-2: custom room → WAREHOUSE (custom room has address '123 Main St' → address is present → succeeds)
    describe('When the type is changed to WAREHOUSE', () => {
      beforeEach(() => {
        mockWarehouseRepository.count.mockResolvedValue(0);
        mockWarehouseRepository.save.mockImplementation(async (model) => model);
      });

      it('Then deletes the custom room, creates a warehouse, and returns ok with the storage UUID', async () => {
        const command = new ChangeStorageTypeCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, StorageType.WAREHOUSE);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().storageUUID).toBe(CR_UUID);
        expect(mockCustomRoomRepository.deleteByUUID).toHaveBeenCalledWith(CR_UUID);
        expect(mockWarehouseRepository.save).toHaveBeenCalledTimes(1);
      });
    });
  });

  // CT-3: same-type change is a no-op
  describe('Given a warehouse that is active', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({ warehouses: [makeWarehouse(WH_UUID)] });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When the type is changed to the same type (WAREHOUSE)', () => {
      it('Then returns ok immediately without deleting or creating anything', async () => {
        const command = new ChangeStorageTypeCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, StorageType.WAREHOUSE);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().storageUUID).toBe(WH_UUID);
        expect(mockWarehouseRepository.deleteByUUID).not.toHaveBeenCalled();
        expect(mockWarehouseRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  // CT-4: storage UUID not found
  describe('Given a storage UUID that does not exist in the aggregate', () => {
    beforeEach(() => {
      const aggregate = makeAggregate();
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When a type change is requested', () => {
      it('Then returns StorageNotFoundError', async () => {
        const command = new ChangeStorageTypeCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, StorageType.STORE_ROOM);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  // CT-5: archived storage cannot be updated
  describe('Given a storage that is archived', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({
        customRooms: [makeCustomRoom(CR_UUID, { archivedAt: new Date() })],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When a type change is requested', () => {
      it('Then returns StorageArchivedCannotBeUpdatedError', async () => {
        const command = new ChangeStorageTypeCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, StorageType.STORE_ROOM);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageArchivedCannotBeUpdatedError);
        expect(mockCustomRoomRepository.deleteByUUID).not.toHaveBeenCalled();
      });
    });
  });

  // CT-6: frozen storage cannot change type
  describe('Given a storage that is frozen', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({
        warehouses: [makeWarehouse(WH_UUID, { frozenAt: new Date() })],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When a type change is requested', () => {
      it('Then returns StorageTypeLockedWhileFrozenError', async () => {
        const command = new ChangeStorageTypeCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, StorageType.STORE_ROOM);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileFrozenError);
        expect(mockWarehouseRepository.deleteByUUID).not.toHaveBeenCalled();
      });
    });
  });

  // CT-7: tier does not allow warehouses
  describe("Given a tenant whose tier does not include warehouse access", () => {
    beforeEach(() => {
      const aggregate = makeAggregate({ storeRooms: [makeStoreRoom(SR_UUID)] });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockCapabilities.canCreateWarehouse.mockReturnValue(false);
    });

    describe('When the type is changed to WAREHOUSE', () => {
      it('Then returns WarehouseRequiresTierUpgradeError without touching repositories', async () => {
        const command = new ChangeStorageTypeCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, StorageType.WAREHOUSE);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
        expect(mockStoreRoomRepository.deleteByUUID).not.toHaveBeenCalled();
        expect(mockWarehouseRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  // CT-8: store room limit reached
  describe('Given a tenant that has reached the store room limit', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({ warehouses: [makeWarehouse(WH_UUID)] });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockStoreRoomRepository.count.mockResolvedValue(5);
      mockCapabilities.canCreateMoreStoreRooms.mockReturnValue(false);
    });

    describe('When the type is changed to STORE_ROOM', () => {
      it('Then returns StoreRoomLimitReachedError without touching repositories', async () => {
        const command = new ChangeStorageTypeCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, StorageType.STORE_ROOM);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StoreRoomLimitReachedError);
        expect(mockWarehouseRepository.deleteByUUID).not.toHaveBeenCalled();
        expect(mockStoreRoomRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  // CT-9: custom room limit reached
  describe('Given a tenant that has reached the custom room limit', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({ warehouses: [makeWarehouse(WH_UUID)] });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockCustomRoomRepository.count.mockResolvedValue(10);
      mockCapabilities.canCreateMoreCustomRooms.mockReturnValue(false);
    });

    describe('When the type is changed to CUSTOM_ROOM', () => {
      it('Then returns CustomRoomLimitReachedError without touching repositories', async () => {
        const command = new ChangeStorageTypeCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, StorageType.CUSTOM_ROOM);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(CustomRoomLimitReachedError);
        expect(mockWarehouseRepository.deleteByUUID).not.toHaveBeenCalled();
        expect(mockCustomRoomRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});

// ── FreezeWarehouseHandler ──────────────────────────────────────────────────────

describe('FreezeWarehouseHandler', () => {
  let handler: FreezeWarehouseHandler;

  beforeEach(() => {
    handler = new FreezeWarehouseHandler(
      mockStorageRepository,
      mockWarehouseRepository,
      mockEventPublisher,
    );
  });

  describe('Given a tenant with an active warehouse', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({ warehouses: [makeWarehouse(WH_UUID)] });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockWarehouseRepository.save.mockImplementation(async (model) => model);
    });

    describe('When freeze is called with a valid storage UUID', () => {
      it('Then freezes the warehouse and persists the change', async () => {
        const command = new FreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockWarehouseRepository.save).toHaveBeenCalledTimes(1);
        expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledWith(
          expect.any(StorageAggregate),
        );
      });
    });
  });

  describe('Given a tenant with no storages', () => {
    beforeEach(() => {
      const aggregate = makeAggregate();
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When freeze is called with an unknown storage UUID', () => {
      it('Then returns StorageNotFoundError', async () => {
        const command = new FreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
        expect(mockWarehouseRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant with a warehouse that is already frozen', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({
        warehouses: [makeWarehouse(WH_UUID, { frozenAt: new Date() })],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When freeze is called on the frozen warehouse', () => {
      it('Then returns StorageAlreadyFrozenError', async () => {
        const command = new FreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyFrozenError);
        expect(mockWarehouseRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant with an archived warehouse', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({
        warehouses: [makeWarehouse(WH_UUID, { archivedAt: new Date() })],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When freeze is called on the archived warehouse', () => {
      it('Then returns StorageArchivedCannotBeFrozenError', async () => {
        const command = new FreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageArchivedCannotBeFrozenError);
        expect(mockWarehouseRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});

// ── FreezeStoreRoomHandler ──────────────────────────────────────────────────────

describe('FreezeStoreRoomHandler', () => {
  let handler: FreezeStoreRoomHandler;

  beforeEach(() => {
    handler = new FreezeStoreRoomHandler(
      mockStorageRepository,
      mockStoreRoomRepository,
      mockEventPublisher,
    );
  });

  describe('Given a tenant with an active store room', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({ storeRooms: [makeStoreRoom(SR_UUID)] });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockStoreRoomRepository.save.mockImplementation(async (model) => model);
    });

    describe('When freeze is called with a valid storage UUID', () => {
      it('Then freezes the store room and persists the change', async () => {
        const command = new FreezeStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockStoreRoomRepository.save).toHaveBeenCalledTimes(1);
        expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledWith(
          expect.any(StorageAggregate),
        );
      });
    });
  });

  describe('Given a tenant with no storages', () => {
    beforeEach(() => {
      const aggregate = makeAggregate();
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When freeze is called with an unknown storage UUID', () => {
      it('Then returns StorageNotFoundError', async () => {
        const command = new FreezeStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
        expect(mockStoreRoomRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant with a store room that is already frozen', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({
        storeRooms: [makeStoreRoom(SR_UUID, { frozenAt: new Date() })],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When freeze is called on the frozen store room', () => {
      it('Then returns StorageAlreadyFrozenError', async () => {
        const command = new FreezeStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyFrozenError);
        expect(mockStoreRoomRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant with an archived store room', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({
        storeRooms: [makeStoreRoom(SR_UUID, { archivedAt: new Date() })],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When freeze is called on the archived store room', () => {
      it('Then returns StorageArchivedCannotBeFrozenError', async () => {
        const command = new FreezeStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageArchivedCannotBeFrozenError);
        expect(mockStoreRoomRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});

// ── FreezeCustomRoomHandler ─────────────────────────────────────────────────────

describe('FreezeCustomRoomHandler', () => {
  let handler: FreezeCustomRoomHandler;

  beforeEach(() => {
    handler = new FreezeCustomRoomHandler(
      mockStorageRepository,
      mockCustomRoomRepository,
      mockEventPublisher,
    );
  });

  describe('Given a tenant with an active custom room', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({ customRooms: [makeCustomRoom(CR_UUID)] });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockCustomRoomRepository.save.mockImplementation(async (model) => model);
    });

    describe('When freeze is called with a valid storage UUID', () => {
      it('Then freezes the custom room and persists the change', async () => {
        const command = new FreezeCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockCustomRoomRepository.save).toHaveBeenCalledTimes(1);
        expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledWith(
          expect.any(StorageAggregate),
        );
      });
    });
  });

  describe('Given a tenant with no storages', () => {
    beforeEach(() => {
      const aggregate = makeAggregate();
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When freeze is called with an unknown storage UUID', () => {
      it('Then returns StorageNotFoundError', async () => {
        const command = new FreezeCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
        expect(mockCustomRoomRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant with a custom room that is already frozen', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({
        customRooms: [makeCustomRoom(CR_UUID, { frozenAt: new Date() })],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When freeze is called on the frozen custom room', () => {
      it('Then returns StorageAlreadyFrozenError', async () => {
        const command = new FreezeCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyFrozenError);
        expect(mockCustomRoomRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant with an archived custom room', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({
        customRooms: [makeCustomRoom(CR_UUID, { archivedAt: new Date() })],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When freeze is called on the archived custom room', () => {
      it('Then returns StorageArchivedCannotBeFrozenError', async () => {
        const command = new FreezeCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageArchivedCannotBeFrozenError);
        expect(mockCustomRoomRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});

// ── UnfreezeWarehouseHandler ────────────────────────────────────────────────────

describe('UnfreezeWarehouseHandler', () => {
  let handler: UnfreezeWarehouseHandler;

  beforeEach(() => {
    handler = new UnfreezeWarehouseHandler(
      mockStorageRepository,
      mockWarehouseRepository,
      mockEventPublisher,
    );
  });

  describe('Given a tenant with a frozen warehouse', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({
        warehouses: [makeWarehouse(WH_UUID, { frozenAt: new Date() })],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockWarehouseRepository.save.mockImplementation(async (model) => model);
    });

    describe('When unfreeze is called on the frozen warehouse', () => {
      it('Then unfreezes the warehouse and persists the change', async () => {
        const command = new UnfreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockWarehouseRepository.save).toHaveBeenCalledTimes(1);
        expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledWith(
          expect.any(StorageAggregate),
        );
      });
    });
  });

  describe('Given a tenant with no storages', () => {
    beforeEach(() => {
      const aggregate = makeAggregate();
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When unfreeze is called with an unknown storage UUID', () => {
      it('Then returns StorageNotFoundError', async () => {
        const command = new UnfreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
        expect(mockWarehouseRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant with an active warehouse that is not frozen', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({ warehouses: [makeWarehouse(WH_UUID)] });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When unfreeze is called on an active warehouse', () => {
      it('Then returns StorageNotFrozenError', async () => {
        const command = new UnfreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFrozenError);
        expect(mockWarehouseRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant with an archived warehouse', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({
        warehouses: [makeWarehouse(WH_UUID, { archivedAt: new Date() })],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When unfreeze is called on an archived warehouse', () => {
      it('Then returns StorageNotFrozenError because archived storage is not considered frozen', async () => {
        const command = new UnfreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFrozenError);
        expect(mockWarehouseRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});

// ── UnfreezeStoreRoomHandler ────────────────────────────────────────────────────

describe('UnfreezeStoreRoomHandler', () => {
  let handler: UnfreezeStoreRoomHandler;

  beforeEach(() => {
    handler = new UnfreezeStoreRoomHandler(
      mockStorageRepository,
      mockStoreRoomRepository,
      mockEventPublisher,
    );
  });

  describe('Given a tenant with a frozen store room', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({
        storeRooms: [makeStoreRoom(SR_UUID, { frozenAt: new Date() })],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockStoreRoomRepository.save.mockImplementation(async (model) => model);
    });

    describe('When unfreeze is called on the frozen store room', () => {
      it('Then unfreezes the store room and persists the change', async () => {
        const command = new UnfreezeStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockStoreRoomRepository.save).toHaveBeenCalledTimes(1);
        expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledWith(
          expect.any(StorageAggregate),
        );
      });
    });
  });

  describe('Given a tenant with no storages', () => {
    beforeEach(() => {
      const aggregate = makeAggregate();
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When unfreeze is called with an unknown storage UUID', () => {
      it('Then returns StorageNotFoundError', async () => {
        const command = new UnfreezeStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
        expect(mockStoreRoomRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant with an active store room that is not frozen', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({ storeRooms: [makeStoreRoom(SR_UUID)] });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When unfreeze is called on an active store room', () => {
      it('Then returns StorageNotFrozenError', async () => {
        const command = new UnfreezeStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFrozenError);
        expect(mockStoreRoomRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant with an archived store room', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({
        storeRooms: [makeStoreRoom(SR_UUID, { archivedAt: new Date() })],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When unfreeze is called on an archived store room', () => {
      it('Then returns StorageNotFrozenError because archived storage is not considered frozen', async () => {
        const command = new UnfreezeStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFrozenError);
        expect(mockStoreRoomRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});

// ── UnfreezeCustomRoomHandler ───────────────────────────────────────────────────

describe('UnfreezeCustomRoomHandler', () => {
  let handler: UnfreezeCustomRoomHandler;

  beforeEach(() => {
    handler = new UnfreezeCustomRoomHandler(
      mockStorageRepository,
      mockCustomRoomRepository,
      mockEventPublisher,
    );
  });

  describe('Given a tenant with a frozen custom room', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({
        customRooms: [makeCustomRoom(CR_UUID, { frozenAt: new Date() })],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
      mockCustomRoomRepository.save.mockImplementation(async (model) => model);
    });

    describe('When unfreeze is called on the frozen custom room', () => {
      it('Then unfreezes the custom room and persists the change', async () => {
        const command = new UnfreezeCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(mockCustomRoomRepository.save).toHaveBeenCalledTimes(1);
        expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledWith(
          expect.any(StorageAggregate),
        );
      });
    });
  });

  describe('Given a tenant with no storages', () => {
    beforeEach(() => {
      const aggregate = makeAggregate();
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When unfreeze is called with an unknown storage UUID', () => {
      it('Then returns StorageNotFoundError', async () => {
        const command = new UnfreezeCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
        expect(mockCustomRoomRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant with an active custom room that is not frozen', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({ customRooms: [makeCustomRoom(CR_UUID)] });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When unfreeze is called on an active custom room', () => {
      it('Then returns StorageNotFrozenError', async () => {
        const command = new UnfreezeCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFrozenError);
        expect(mockCustomRoomRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a tenant with an archived custom room', () => {
    beforeEach(() => {
      const aggregate = makeAggregate({
        customRooms: [makeCustomRoom(CR_UUID, { archivedAt: new Date() })],
      });
      mockStorageRepository.findOrCreate.mockResolvedValue(aggregate);
    });

    describe('When unfreeze is called on an archived custom room', () => {
      it('Then returns StorageNotFrozenError because archived storage is not considered frozen', async () => {
        const command = new UnfreezeCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID);
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFrozenError);
        expect(mockCustomRoomRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});
