import type { EventPublisher } from '@nestjs/cqrs';
import { CreateCustomRoomCommand } from '@storage/application/commands/create-custom-room/create-custom-room.command';
import { CreateCustomRoomHandler } from '@storage/application/commands/create-custom-room/create-custom-room.handler';
import { CreateStoreRoomCommand } from '@storage/application/commands/create-store-room/create-store-room.command';
import { CreateStoreRoomHandler } from '@storage/application/commands/create-store-room/create-store-room.handler';
import { CreateWarehouseCommand } from '@storage/application/commands/create-warehouse/create-warehouse.command';
import { CreateWarehouseHandler } from '@storage/application/commands/create-warehouse/create-warehouse.handler';
import { CustomRoomLimitReachedError } from '@storage/application/errors/custom-room-limit-reached.error';
import { StoreRoomLimitReachedError } from '@storage/application/errors/store-room-limit-reached.error';
import { WarehouseRequiresTierUpgradeError } from '@storage/application/errors/warehouse-requires-tier-upgrade.error';
import type {
  ITenantCapabilitiesPort,
  TenantCapabilities,
} from '@storage/application/ports/tenant-capabilities.port';
import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import type { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import type { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import type { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import type { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000099';
const STORAGE_ID = 17;

const eventPublisherStub: EventPublisher = {
  mergeObjectContext: jest.fn(<T>(aggregate: T): T => aggregate),
} as unknown as EventPublisher;

function buildContainer(): StorageAggregate {
  return StorageAggregate.reconstitute({
    id: STORAGE_ID,
    uuid: '019538a0-0000-7000-8000-0000000000ff',
    tenantUUID: TENANT_UUID,
    warehouses: [],
    storeRooms: [],
    customRooms: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  });
}

function buildCapabilities(overrides: Partial<TenantCapabilities> = {}): TenantCapabilities {
  return {
    canCreateWarehouse: () => true,
    canCreateMoreWarehouses: () => true,
    canCreateMoreCustomRooms: () => true,
    canCreateMoreStoreRooms: () => true,
    exceedsWarehouseLimit: () => false,
    exceedsStoreRoomLimit: () => false,
    exceedsCustomRoomLimit: () => false,
    ...overrides,
  };
}

function makeStorageRepoStub(): jest.Mocked<IStorageRepository> {
  return {
    findOrCreate: jest.fn(),
    existsActiveName: jest.fn().mockResolvedValue(false),
    findIdByTenantUUID: jest.fn(),
  };
}

function makeWarehouseRepoStub(): jest.Mocked<IWarehouseRepository> {
  return {
    count: jest.fn().mockResolvedValue(0),
    findByUUID: jest.fn(),
    save: jest.fn().mockImplementation((aggregate) => Promise.resolve(aggregate)),
    deleteByUUID: jest.fn(),
  };
}

function makeStoreRoomRepoStub(): jest.Mocked<IStoreRoomRepository> {
  return {
    count: jest.fn().mockResolvedValue(0),
    findByUUID: jest.fn(),
    save: jest.fn().mockImplementation((aggregate) => Promise.resolve(aggregate)),
    deleteByUUID: jest.fn(),
  };
}

function makeCustomRoomRepoStub(): jest.Mocked<ICustomRoomRepository> {
  return {
    count: jest.fn().mockResolvedValue(0),
    findByUUID: jest.fn(),
    save: jest.fn().mockImplementation((aggregate) => Promise.resolve(aggregate)),
    deleteByUUID: jest.fn(),
  };
}

function makeCapabilitiesPortStub(
  capabilities: TenantCapabilities = buildCapabilities(),
): jest.Mocked<ITenantCapabilitiesPort> {
  return {
    getCapabilities: jest.fn().mockResolvedValue(capabilities),
  };
}

// ─── CreateWarehouseHandler ───────────────────────────────────────────────────

describe('CreateWarehouseHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let warehouseRepo: jest.Mocked<IWarehouseRepository>;
  let capabilitiesPort: jest.Mocked<ITenantCapabilitiesPort>;
  let handler: CreateWarehouseHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    warehouseRepo = makeWarehouseRepoStub();
    capabilitiesPort = makeCapabilitiesPortStub();
    handler = new CreateWarehouseHandler(
      storageRepo,
      warehouseRepo,
      capabilitiesPort,
      eventPublisherStub,
    );

    storageRepo.findOrCreate.mockResolvedValue(buildContainer());
  });

  describe('Given a tenant within tier limits and a unique name', () => {
    describe('When execute is called', () => {
      it('Then it persists the warehouse and returns its uuid', async () => {
        const command = new CreateWarehouseCommand(
          TENANT_UUID,
          'Main Warehouse',
          '500 Industrial Ave',
          ACTOR_UUID,
          'Primary stock',
        );

        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(warehouseRepo.save).toHaveBeenCalledWith(expect.anything(), STORAGE_ID);
        expect(eventPublisherStub.mergeObjectContext).toHaveBeenCalled();
      });
    });
  });

  describe('Given a plan that does not allow warehouses at all', () => {
    describe('When execute is called', () => {
      it('Then it returns WarehouseRequiresTierUpgradeError without saving', async () => {
        capabilitiesPort.getCapabilities.mockResolvedValue(
          buildCapabilities({ canCreateWarehouse: () => false }),
        );

        const command = new CreateWarehouseCommand(TENANT_UUID, 'Disallowed', 'addr', ACTOR_UUID);

        const result = await handler.execute(command);

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
        expect(warehouseRepo.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the tenant has reached the warehouse cap', () => {
    describe('When execute is called', () => {
      it('Then it returns WarehouseRequiresTierUpgradeError', async () => {
        warehouseRepo.count.mockResolvedValue(3);
        capabilitiesPort.getCapabilities.mockResolvedValue(
          buildCapabilities({
            canCreateMoreWarehouses: (current) => current < 3,
          }),
        );

        const command = new CreateWarehouseCommand(TENANT_UUID, 'Overflow', 'addr', ACTOR_UUID);

        const result = await handler.execute(command);

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
        expect(warehouseRepo.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given another active storage already uses the same name', () => {
    describe('When execute is called', () => {
      it('Then it returns StorageNameAlreadyExistsError', async () => {
        storageRepo.existsActiveName.mockResolvedValue(true);

        const command = new CreateWarehouseCommand(TENANT_UUID, 'Duplicated', 'addr', ACTOR_UUID);

        const result = await handler.execute(command);

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
        expect(warehouseRepo.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the storage container persists without an id (corrupt invariant)', () => {
    describe('When execute is called', () => {
      it('Then it throws to surface the invariant violation', async () => {
        storageRepo.findOrCreate.mockResolvedValue(
          StorageAggregate.create({ tenantUUID: TENANT_UUID }),
        );

        const command = new CreateWarehouseCommand(TENANT_UUID, 'Broken', 'addr', ACTOR_UUID);

        await expect(handler.execute(command)).rejects.toThrow(/persisted without id/);
      });
    });
  });
});

// ─── CreateStoreRoomHandler ───────────────────────────────────────────────────

describe('CreateStoreRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let storeRoomRepo: jest.Mocked<IStoreRoomRepository>;
  let capabilitiesPort: jest.Mocked<ITenantCapabilitiesPort>;
  let handler: CreateStoreRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    storeRoomRepo = makeStoreRoomRepoStub();
    capabilitiesPort = makeCapabilitiesPortStub();
    handler = new CreateStoreRoomHandler(
      storageRepo,
      storeRoomRepo,
      capabilitiesPort,
      eventPublisherStub,
    );

    storageRepo.findOrCreate.mockResolvedValue(buildContainer());
  });

  describe('Given the tenant is within the store-room cap', () => {
    describe('When execute is called', () => {
      it('Then it persists and returns the new store-room uuid', async () => {
        const result = await handler.execute(
          new CreateStoreRoomCommand(TENANT_UUID, 'Front Counter', null, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(storeRoomRepo.save).toHaveBeenCalledWith(expect.anything(), STORAGE_ID);
      });
    });
  });

  describe('Given the tenant is at the store-room cap', () => {
    describe('When execute is called', () => {
      it('Then it returns StoreRoomLimitReachedError', async () => {
        storeRoomRepo.count.mockResolvedValue(5);
        capabilitiesPort.getCapabilities.mockResolvedValue(
          buildCapabilities({
            canCreateMoreStoreRooms: (current) => current < 5,
          }),
        );

        const result = await handler.execute(
          new CreateStoreRoomCommand(TENANT_UUID, 'Overflow', null, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StoreRoomLimitReachedError);
        expect(storeRoomRepo.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the requested name is already taken in the tenant', () => {
    describe('When execute is called', () => {
      it('Then it returns StorageNameAlreadyExistsError', async () => {
        storageRepo.existsActiveName.mockResolvedValue(true);

        const result = await handler.execute(
          new CreateStoreRoomCommand(TENANT_UUID, 'Already-Taken', 'somewhere', ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
        expect(storeRoomRepo.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the storage container is missing an id', () => {
    describe('When execute is called', () => {
      it('Then it throws an invariant-violation error', async () => {
        storageRepo.findOrCreate.mockResolvedValue(
          StorageAggregate.create({ tenantUUID: TENANT_UUID }),
        );

        await expect(
          handler.execute(new CreateStoreRoomCommand(TENANT_UUID, 'Broken SR', null, ACTOR_UUID)),
        ).rejects.toThrow(/persisted without id/);
      });
    });
  });
});

// ─── CreateCustomRoomHandler ──────────────────────────────────────────────────

describe('CreateCustomRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let customRoomRepo: jest.Mocked<ICustomRoomRepository>;
  let capabilitiesPort: jest.Mocked<ITenantCapabilitiesPort>;
  let handler: CreateCustomRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    customRoomRepo = makeCustomRoomRepoStub();
    capabilitiesPort = makeCapabilitiesPortStub();
    handler = new CreateCustomRoomHandler(
      storageRepo,
      customRoomRepo,
      capabilitiesPort,
      eventPublisherStub,
    );

    storageRepo.findOrCreate.mockResolvedValue(buildContainer());
  });

  describe('Given a tenant within the custom-room cap', () => {
    describe('When execute is called with a custom icon and color', () => {
      it('Then it persists the room with the operator-provided icon/color', async () => {
        const result = await handler.execute(
          new CreateCustomRoomCommand(
            TENANT_UUID,
            'Server Closet',
            'IT',
            null,
            ACTOR_UUID,
            'Air-conditioned',
            'router',
            '#0099ff',
          ),
        );

        expect(result.isOk()).toBe(true);
        expect(customRoomRepo.save).toHaveBeenCalledWith(expect.anything(), STORAGE_ID);
      });
    });
  });

  describe('Given a tenant at the custom-room cap', () => {
    describe('When execute is called', () => {
      it('Then it returns CustomRoomLimitReachedError', async () => {
        customRoomRepo.count.mockResolvedValue(10);
        capabilitiesPort.getCapabilities.mockResolvedValue(
          buildCapabilities({
            canCreateMoreCustomRooms: (current) => current < 10,
          }),
        );

        const result = await handler.execute(
          new CreateCustomRoomCommand(TENANT_UUID, 'Overflow', 'Office', null, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(CustomRoomLimitReachedError);
      });
    });
  });

  describe('Given a name already in use', () => {
    describe('When execute is called', () => {
      it('Then it returns StorageNameAlreadyExistsError', async () => {
        storageRepo.existsActiveName.mockResolvedValue(true);

        const result = await handler.execute(
          new CreateCustomRoomCommand(TENANT_UUID, 'Duplicate', 'Office', null, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
      });
    });
  });

  describe('Given the storage container is missing an id', () => {
    describe('When execute is called', () => {
      it('Then it throws an invariant-violation error', async () => {
        storageRepo.findOrCreate.mockResolvedValue(
          StorageAggregate.create({ tenantUUID: TENANT_UUID }),
        );

        await expect(
          handler.execute(
            new CreateCustomRoomCommand(TENANT_UUID, 'Broken CR', 'Office', null, ACTOR_UUID),
          ),
        ).rejects.toThrow(/persisted without id/);
      });
    });
  });
});
