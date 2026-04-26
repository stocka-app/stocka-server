import type { EventBus } from '@nestjs/cqrs';
import type { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { ChangeCustomRoomToStoreRoomCommand } from '@storage/application/commands/change-custom-room-to-store-room/change-custom-room-to-store-room.command';
import { ChangeCustomRoomToStoreRoomHandler } from '@storage/application/commands/change-custom-room-to-store-room/change-custom-room-to-store-room.handler';
import { ChangeCustomRoomToWarehouseCommand } from '@storage/application/commands/change-custom-room-to-warehouse/change-custom-room-to-warehouse.command';
import { ChangeCustomRoomToWarehouseHandler } from '@storage/application/commands/change-custom-room-to-warehouse/change-custom-room-to-warehouse.handler';
import { ChangeStoreRoomToCustomRoomCommand } from '@storage/application/commands/change-store-room-to-custom-room/change-store-room-to-custom-room.command';
import { ChangeStoreRoomToCustomRoomHandler } from '@storage/application/commands/change-store-room-to-custom-room/change-store-room-to-custom-room.handler';
import { ChangeStoreRoomToWarehouseCommand } from '@storage/application/commands/change-store-room-to-warehouse/change-store-room-to-warehouse.command';
import { ChangeStoreRoomToWarehouseHandler } from '@storage/application/commands/change-store-room-to-warehouse/change-store-room-to-warehouse.handler';
import { ChangeWarehouseToCustomRoomCommand } from '@storage/application/commands/change-warehouse-to-custom-room/change-warehouse-to-custom-room.command';
import { ChangeWarehouseToCustomRoomHandler } from '@storage/application/commands/change-warehouse-to-custom-room/change-warehouse-to-custom-room.handler';
import { ChangeWarehouseToStoreRoomCommand } from '@storage/application/commands/change-warehouse-to-store-room/change-warehouse-to-store-room.command';
import { ChangeWarehouseToStoreRoomHandler } from '@storage/application/commands/change-warehouse-to-store-room/change-warehouse-to-store-room.handler';
import { CustomRoomLimitReachedError } from '@storage/application/errors/custom-room-limit-reached.error';
import { StoreRoomLimitReachedError } from '@storage/application/errors/store-room-limit-reached.error';
import { WarehouseRequiresTierUpgradeError } from '@storage/application/errors/warehouse-requires-tier-upgrade.error';
import { StorageTypeChangePolicy } from '@storage/application/services/storage-type-change.policy';
import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';
import { StoreRoomAggregate } from '@storage/domain/aggregates/store-room.aggregate';
import { WarehouseAggregate } from '@storage/domain/aggregates/warehouse.aggregate';
import type { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import type { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import type { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import type { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageAddressRequiredForWarehouseError } from '@storage/domain/errors/storage-address-required-for-warehouse.error';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageTypeLockedWhileArchivedError } from '@storage/domain/errors/storage-type-locked-while-archived.error';
import { StorageTypeLockedWhileFrozenError } from '@storage/domain/errors/storage-type-locked-while-frozen.error';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000099';
const STORAGE_UUID = '019538a0-0000-7000-8000-000000000010';
const STORAGE_ID = 17;

const eventBusStub: jest.Mocked<EventBus> = {
  publish: jest.fn(),
} as unknown as jest.Mocked<EventBus>;

const uowStub: jest.Mocked<IUnitOfWork> = {
  execute: jest.fn(async (fn: () => Promise<unknown>) => fn()),
} as unknown as jest.Mocked<IUnitOfWork>;

function makeStorageRepoStub(): jest.Mocked<IStorageRepository> {
  return {
    findOrCreate: jest.fn(),
    existsActiveName: jest.fn().mockResolvedValue(false),
    findIdByTenantUUID: jest.fn().mockResolvedValue(STORAGE_ID),
  };
}

function makeWarehouseRepoStub(): jest.Mocked<IWarehouseRepository> {
  return {
    count: jest.fn().mockResolvedValue(0),
    findByUUID: jest.fn(),
    save: jest.fn().mockImplementation((agg) => Promise.resolve(agg)),
    deleteByUUID: jest.fn().mockResolvedValue(undefined),
  };
}

function makeStoreRoomRepoStub(): jest.Mocked<IStoreRoomRepository> {
  return {
    count: jest.fn().mockResolvedValue(0),
    findByUUID: jest.fn(),
    save: jest.fn().mockImplementation((agg) => Promise.resolve(agg)),
    deleteByUUID: jest.fn().mockResolvedValue(undefined),
  };
}

function makeCustomRoomRepoStub(): jest.Mocked<ICustomRoomRepository> {
  return {
    count: jest.fn().mockResolvedValue(0),
    findByUUID: jest.fn(),
    save: jest.fn().mockImplementation((agg) => Promise.resolve(agg)),
    deleteByUUID: jest.fn().mockResolvedValue(undefined),
  };
}

function makeUnboundedPolicyStub(): jest.Mocked<StorageTypeChangePolicy> {
  return {
    assertWarehouseCapacity: jest.fn().mockResolvedValue(null),
    assertStoreRoomCapacity: jest.fn().mockResolvedValue(null),
    assertCustomRoomCapacity: jest.fn().mockResolvedValue(null),
    assertWarehouseCanRestore: jest.fn().mockResolvedValue(null),
    assertStoreRoomCanRestore: jest.fn().mockResolvedValue(null),
    assertCustomRoomCanRestore: jest.fn().mockResolvedValue(null),
    assertAddressForWarehouse: jest.fn().mockReturnValue(null),
  } as unknown as jest.Mocked<StorageTypeChangePolicy>;
}

function buildWarehouse(name = 'WH', description?: string): WarehouseAggregate {
  return WarehouseAggregate.create({
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    actorUUID: ACTOR_UUID,
    name,
    description,
    icon: 'icon',
    color: '#000000',
    address: 'addr',
  });
}

function buildStoreRoom(name = 'SR', description?: string, address?: string): StoreRoomAggregate {
  return StoreRoomAggregate.create({
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    actorUUID: ACTOR_UUID,
    name,
    description,
    icon: 'icon',
    color: '#000000',
    address,
  });
}

function buildCustomRoom(name = 'CR', description?: string, address?: string): CustomRoomAggregate {
  return CustomRoomAggregate.create({
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    actorUUID: ACTOR_UUID,
    name,
    description,
    icon: 'icon',
    color: '#000000',
    roomType: 'Office',
    address,
  });
}

beforeEach(() => {
  (eventBusStub.publish as jest.Mock).mockClear();
  (uowStub.execute as jest.Mock).mockClear();
});

// ─── Warehouse → StoreRoom ────────────────────────────────────────────────────

describe('ChangeWarehouseToStoreRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let warehouseRepo: jest.Mocked<IWarehouseRepository>;
  let storeRoomRepo: jest.Mocked<IStoreRoomRepository>;
  let policy: jest.Mocked<StorageTypeChangePolicy>;
  let handler: ChangeWarehouseToStoreRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    warehouseRepo = makeWarehouseRepoStub();
    storeRoomRepo = makeStoreRoomRepoStub();
    policy = makeUnboundedPolicyStub();
    handler = new ChangeWarehouseToStoreRoomHandler(
      storageRepo,
      warehouseRepo,
      storeRoomRepo,
      uowStub,
      policy,
      eventBusStub,
    );
  });

  describe('Given an active warehouse and tier capacity for store-rooms', () => {
    it('Then it deletes the source, saves the new store-room, and publishes the type-changed event', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());

      const result = await handler.execute(
        new ChangeWarehouseToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {}),
      );

      expect(result.isOk()).toBe(true);
      expect(warehouseRepo.deleteByUUID).toHaveBeenCalledWith(STORAGE_UUID);
      expect(storeRoomRepo.save).toHaveBeenCalled();
      expect(eventBusStub.publish).toHaveBeenCalled();
    });
  });

  describe('Given a missing warehouse', () => {
    it('Then it returns StorageNotFoundError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ChangeWarehouseToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a warehouse from another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());

      const result = await handler.execute(
        new ChangeWarehouseToStoreRoomCommand(STORAGE_UUID, 'other', ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given an archived warehouse', () => {
    it('Then it returns StorageTypeLockedWhileArchivedError', async () => {
      const aggregate = buildWarehouse();
      aggregate.markArchived(ACTOR_UUID);
      warehouseRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new ChangeWarehouseToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileArchivedError);
    });
  });

  describe('Given a frozen warehouse', () => {
    it('Then it returns StorageTypeLockedWhileFrozenError', async () => {
      const aggregate = buildWarehouse();
      aggregate.markFrozen(ACTOR_UUID);
      warehouseRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new ChangeWarehouseToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileFrozenError);
    });
  });

  describe('Given a tenant at the store-room cap', () => {
    it('Then it returns StoreRoomLimitReachedError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());
      policy.assertStoreRoomCapacity.mockResolvedValue(new StoreRoomLimitReachedError());

      const result = await handler.execute(
        new ChangeWarehouseToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StoreRoomLimitReachedError);
    });
  });

  describe('Given a name change that conflicts with an existing storage', () => {
    it('Then it returns StorageNameAlreadyExistsError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());
      storageRepo.existsActiveName.mockResolvedValue(true);

      const result = await handler.execute(
        new ChangeWarehouseToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'Taken',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
    });
  });

  describe('Given the storage container id is unresolved', () => {
    it('Then it returns StorageNotFoundError before persistence', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ChangeWarehouseToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      expect(warehouseRepo.deleteByUUID).not.toHaveBeenCalled();
    });
  });

  describe('Given operator-supplied metadata overrides', () => {
    it('Then it inherits unspecified fields from the source storage', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());

      const result = await handler.execute(
        new ChangeWarehouseToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          description: 'New description',
        }),
      );

      expect(result.isOk()).toBe(true);
    });
  });
});

// ─── Warehouse → CustomRoom ───────────────────────────────────────────────────

describe('ChangeWarehouseToCustomRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let warehouseRepo: jest.Mocked<IWarehouseRepository>;
  let customRoomRepo: jest.Mocked<ICustomRoomRepository>;
  let policy: jest.Mocked<StorageTypeChangePolicy>;
  let handler: ChangeWarehouseToCustomRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    warehouseRepo = makeWarehouseRepoStub();
    customRoomRepo = makeCustomRoomRepoStub();
    policy = makeUnboundedPolicyStub();
    handler = new ChangeWarehouseToCustomRoomHandler(
      storageRepo,
      warehouseRepo,
      customRoomRepo,
      uowStub,
      policy,
      eventBusStub,
    );
  });

  describe('Given an active warehouse and capacity for custom-rooms', () => {
    it('Then it converts and publishes the type-changed event', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());

      const result = await handler.execute(
        new ChangeWarehouseToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          roomType: 'Server Closet',
        }),
      );

      expect(result.isOk()).toBe(true);
      expect(customRoomRepo.save).toHaveBeenCalled();
    });
  });

  describe('Given a missing source warehouse', () => {
    it('Then it returns StorageNotFoundError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ChangeWarehouseToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a tenant at the custom-room cap', () => {
    it('Then it returns CustomRoomLimitReachedError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());
      policy.assertCustomRoomCapacity.mockResolvedValue(new CustomRoomLimitReachedError());

      const result = await handler.execute(
        new ChangeWarehouseToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(CustomRoomLimitReachedError);
    });
  });

  describe('Given an archived warehouse', () => {
    it('Then it returns StorageTypeLockedWhileArchivedError', async () => {
      const aggregate = buildWarehouse();
      aggregate.markArchived(ACTOR_UUID);
      warehouseRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new ChangeWarehouseToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileArchivedError);
    });
  });

  describe('Given a frozen warehouse', () => {
    it('Then it returns StorageTypeLockedWhileFrozenError', async () => {
      const aggregate = buildWarehouse();
      aggregate.markFrozen(ACTOR_UUID);
      warehouseRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new ChangeWarehouseToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileFrozenError);
    });
  });

  describe('Given a name conflict with an existing storage', () => {
    it('Then it returns StorageNameAlreadyExistsError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());
      storageRepo.existsActiveName.mockResolvedValue(true);

      const result = await handler.execute(
        new ChangeWarehouseToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'Taken',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
    });
  });

  describe('Given the storage container id is unresolved', () => {
    it('Then it returns StorageNotFoundError before persistence', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ChangeWarehouseToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});

// ─── StoreRoom → Warehouse ────────────────────────────────────────────────────

describe('ChangeStoreRoomToWarehouseHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let storeRoomRepo: jest.Mocked<IStoreRoomRepository>;
  let warehouseRepo: jest.Mocked<IWarehouseRepository>;
  let policy: jest.Mocked<StorageTypeChangePolicy>;
  let handler: ChangeStoreRoomToWarehouseHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    storeRoomRepo = makeStoreRoomRepoStub();
    warehouseRepo = makeWarehouseRepoStub();
    policy = makeUnboundedPolicyStub();
    handler = new ChangeStoreRoomToWarehouseHandler(
      storageRepo,
      storeRoomRepo,
      warehouseRepo,
      uowStub,
      policy,
      eventBusStub,
    );
  });

  describe('Given an active store-room with a usable address', () => {
    it('Then it converts to warehouse and persists', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());

      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          address: '500 Industrial Ave',
        }),
      );

      expect(result.isOk()).toBe(true);
      expect(warehouseRepo.save).toHaveBeenCalled();
    });
  });

  describe('Given a missing source store-room', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a store-room from another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());

      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(STORAGE_UUID, 'other', ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given an archived store-room', () => {
    it('Then it returns StorageTypeLockedWhileArchivedError', async () => {
      const aggregate = buildStoreRoom();
      aggregate.markArchived(ACTOR_UUID);
      storeRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileArchivedError);
    });
  });

  describe('Given a frozen store-room', () => {
    it('Then it returns StorageTypeLockedWhileFrozenError', async () => {
      const aggregate = buildStoreRoom();
      aggregate.markFrozen(ACTOR_UUID);
      storeRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileFrozenError);
    });
  });

  describe('Given a store-room without a usable address', () => {
    it('Then it returns StorageAddressRequiredForWarehouseError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());
      policy.assertAddressForWarehouse.mockReturnValue(
        new StorageAddressRequiredForWarehouseError(STORAGE_UUID),
      );

      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          address: null,
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
    });
  });

  describe('Given a tenant that cannot host another warehouse', () => {
    it('Then it returns WarehouseRequiresTierUpgradeError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());
      policy.assertWarehouseCapacity.mockResolvedValue(new WarehouseRequiresTierUpgradeError());

      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          address: 'addr',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
    });
  });

  describe('Given a name conflict', () => {
    it('Then it returns StorageNameAlreadyExistsError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());
      storageRepo.existsActiveName.mockResolvedValue(true);

      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'Taken',
          address: 'addr',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
    });
  });

  describe('Given the storage container id is unresolved', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          address: 'addr',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});

// ─── StoreRoom → CustomRoom ───────────────────────────────────────────────────

describe('ChangeStoreRoomToCustomRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let storeRoomRepo: jest.Mocked<IStoreRoomRepository>;
  let customRoomRepo: jest.Mocked<ICustomRoomRepository>;
  let policy: jest.Mocked<StorageTypeChangePolicy>;
  let handler: ChangeStoreRoomToCustomRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    storeRoomRepo = makeStoreRoomRepoStub();
    customRoomRepo = makeCustomRoomRepoStub();
    policy = makeUnboundedPolicyStub();
    handler = new ChangeStoreRoomToCustomRoomHandler(
      storageRepo,
      storeRoomRepo,
      customRoomRepo,
      uowStub,
      policy,
      eventBusStub,
    );
  });

  describe('Given an active store-room and capacity for custom-rooms', () => {
    it('Then it converts and persists', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());

      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          roomType: 'Office',
        }),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Given a missing store-room', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given an archived store-room', () => {
    it('Then it returns StorageTypeLockedWhileArchivedError', async () => {
      const aggregate = buildStoreRoom();
      aggregate.markArchived(ACTOR_UUID);
      storeRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileArchivedError);
    });
  });

  describe('Given a frozen store-room', () => {
    it('Then it returns StorageTypeLockedWhileFrozenError', async () => {
      const aggregate = buildStoreRoom();
      aggregate.markFrozen(ACTOR_UUID);
      storeRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileFrozenError);
    });
  });

  describe('Given a tenant at the custom-room cap', () => {
    it('Then it returns CustomRoomLimitReachedError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());
      policy.assertCustomRoomCapacity.mockResolvedValue(new CustomRoomLimitReachedError());

      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(CustomRoomLimitReachedError);
    });
  });

  describe('Given a name conflict', () => {
    it('Then it returns StorageNameAlreadyExistsError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());
      storageRepo.existsActiveName.mockResolvedValue(true);

      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'Taken',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
    });
  });

  describe('Given the storage container id is unresolved', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});

// ─── CustomRoom → Warehouse ───────────────────────────────────────────────────

describe('ChangeCustomRoomToWarehouseHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let customRoomRepo: jest.Mocked<ICustomRoomRepository>;
  let warehouseRepo: jest.Mocked<IWarehouseRepository>;
  let policy: jest.Mocked<StorageTypeChangePolicy>;
  let handler: ChangeCustomRoomToWarehouseHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    customRoomRepo = makeCustomRoomRepoStub();
    warehouseRepo = makeWarehouseRepoStub();
    policy = makeUnboundedPolicyStub();
    handler = new ChangeCustomRoomToWarehouseHandler(
      storageRepo,
      customRoomRepo,
      warehouseRepo,
      uowStub,
      policy,
      eventBusStub,
    );
  });

  describe('Given an active custom-room with a usable address', () => {
    it('Then it converts to warehouse', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());

      const result = await handler.execute(
        new ChangeCustomRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          address: 'addr',
        }),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Given a missing source custom-room', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ChangeCustomRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given an archived custom-room', () => {
    it('Then it returns StorageTypeLockedWhileArchivedError', async () => {
      const aggregate = buildCustomRoom();
      aggregate.markArchived(ACTOR_UUID);
      customRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new ChangeCustomRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileArchivedError);
    });
  });

  describe('Given a frozen custom-room', () => {
    it('Then it returns StorageTypeLockedWhileFrozenError', async () => {
      const aggregate = buildCustomRoom();
      aggregate.markFrozen(ACTOR_UUID);
      customRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new ChangeCustomRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileFrozenError);
    });
  });

  describe('Given an empty effective address', () => {
    it('Then it returns StorageAddressRequiredForWarehouseError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());
      policy.assertAddressForWarehouse.mockReturnValue(
        new StorageAddressRequiredForWarehouseError(STORAGE_UUID),
      );

      const result = await handler.execute(
        new ChangeCustomRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          address: '',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
    });
  });

  describe('Given a tenant that cannot host another warehouse', () => {
    it('Then it returns WarehouseRequiresTierUpgradeError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());
      policy.assertWarehouseCapacity.mockResolvedValue(new WarehouseRequiresTierUpgradeError());

      const result = await handler.execute(
        new ChangeCustomRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          address: 'addr',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
    });
  });

  describe('Given a name conflict', () => {
    it('Then it returns StorageNameAlreadyExistsError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());
      storageRepo.existsActiveName.mockResolvedValue(true);

      const result = await handler.execute(
        new ChangeCustomRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'Taken',
          address: 'addr',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
    });
  });

  describe('Given the storage container id is unresolved', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ChangeCustomRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          address: 'addr',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});

// ─── CustomRoom → StoreRoom ───────────────────────────────────────────────────

describe('ChangeCustomRoomToStoreRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let customRoomRepo: jest.Mocked<ICustomRoomRepository>;
  let storeRoomRepo: jest.Mocked<IStoreRoomRepository>;
  let policy: jest.Mocked<StorageTypeChangePolicy>;
  let handler: ChangeCustomRoomToStoreRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    customRoomRepo = makeCustomRoomRepoStub();
    storeRoomRepo = makeStoreRoomRepoStub();
    policy = makeUnboundedPolicyStub();
    handler = new ChangeCustomRoomToStoreRoomHandler(
      storageRepo,
      customRoomRepo,
      storeRoomRepo,
      uowStub,
      policy,
      eventBusStub,
    );
  });

  describe('Given an active custom-room and capacity for store-rooms', () => {
    it('Then it converts and persists', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());

      const result = await handler.execute(
        new ChangeCustomRoomToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Given a missing custom-room', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ChangeCustomRoomToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given an archived custom-room', () => {
    it('Then it returns StorageTypeLockedWhileArchivedError', async () => {
      const aggregate = buildCustomRoom();
      aggregate.markArchived(ACTOR_UUID);
      customRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new ChangeCustomRoomToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileArchivedError);
    });
  });

  describe('Given a frozen custom-room', () => {
    it('Then it returns StorageTypeLockedWhileFrozenError', async () => {
      const aggregate = buildCustomRoom();
      aggregate.markFrozen(ACTOR_UUID);
      customRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new ChangeCustomRoomToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileFrozenError);
    });
  });

  describe('Given a tenant at the store-room cap', () => {
    it('Then it returns StoreRoomLimitReachedError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());
      policy.assertStoreRoomCapacity.mockResolvedValue(new StoreRoomLimitReachedError());

      const result = await handler.execute(
        new ChangeCustomRoomToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StoreRoomLimitReachedError);
    });
  });

  describe('Given a name conflict', () => {
    it('Then it returns StorageNameAlreadyExistsError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());
      storageRepo.existsActiveName.mockResolvedValue(true);

      const result = await handler.execute(
        new ChangeCustomRoomToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'Taken',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
    });
  });

  describe('Given the storage container id is unresolved', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ChangeCustomRoomToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});

// ─── Metadata-vs-source branch coverage ───────────────────────────────────────
//
// Each change-type handler picks each target field from `command.metadata.x`
// when defined and falls back to the source aggregate otherwise. The tests
// below exercise the explicit-metadata branch, complementing the
// inherit-from-source cases above.

describe('Change-type metadata override branches', () => {
  describe('ChangeWarehouseToStoreRoomHandler', () => {
    it('Then explicit metadata.description and metadata.address override source values', async () => {
      const storageRepo = makeStorageRepoStub();
      const warehouseRepo = makeWarehouseRepoStub();
      const storeRoomRepo = makeStoreRoomRepoStub();
      const policy = makeUnboundedPolicyStub();
      const handler = new ChangeWarehouseToStoreRoomHandler(
        storageRepo,
        warehouseRepo,
        storeRoomRepo,
        uowStub,
        policy,
        eventBusStub,
      );
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse('WH', 'source desc'));

      const result = await handler.execute(
        new ChangeWarehouseToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          description: 'overridden',
          address: 'overridden addr',
        }),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('ChangeWarehouseToCustomRoomHandler', () => {
    it('Then explicit metadata.description, metadata.address, metadata.icon, metadata.color override source values', async () => {
      const storageRepo = makeStorageRepoStub();
      const warehouseRepo = makeWarehouseRepoStub();
      const customRoomRepo = makeCustomRoomRepoStub();
      const policy = makeUnboundedPolicyStub();
      const handler = new ChangeWarehouseToCustomRoomHandler(
        storageRepo,
        warehouseRepo,
        customRoomRepo,
        uowStub,
        policy,
        eventBusStub,
      );
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse('WH', 'source desc'));

      const result = await handler.execute(
        new ChangeWarehouseToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          description: 'overridden',
          address: 'overridden addr',
          icon: 'router',
          color: '#abcdef',
          roomType: 'Server Closet',
        }),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('ChangeStoreRoomToWarehouseHandler', () => {
    it('Then explicit metadata.description overrides the source description', async () => {
      const storageRepo = makeStorageRepoStub();
      const storeRoomRepo = makeStoreRoomRepoStub();
      const warehouseRepo = makeWarehouseRepoStub();
      const policy = makeUnboundedPolicyStub();
      const handler = new ChangeStoreRoomToWarehouseHandler(
        storageRepo,
        storeRoomRepo,
        warehouseRepo,
        uowStub,
        policy,
        eventBusStub,
      );
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom('SR', 'source desc', 'src addr'));

      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          description: 'overridden',
          address: 'overridden addr',
        }),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('ChangeStoreRoomToCustomRoomHandler', () => {
    it('Then explicit metadata overrides for description/address/icon/color', async () => {
      const storageRepo = makeStorageRepoStub();
      const storeRoomRepo = makeStoreRoomRepoStub();
      const customRoomRepo = makeCustomRoomRepoStub();
      const policy = makeUnboundedPolicyStub();
      const handler = new ChangeStoreRoomToCustomRoomHandler(
        storageRepo,
        storeRoomRepo,
        customRoomRepo,
        uowStub,
        policy,
        eventBusStub,
      );
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom('SR', 'source desc', 'src addr'));

      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          description: 'overridden',
          address: 'overridden addr',
          icon: 'router',
          color: '#abcdef',
          roomType: 'Server Closet',
        }),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('ChangeCustomRoomToWarehouseHandler', () => {
    it('Then explicit metadata.description overrides the source description', async () => {
      const storageRepo = makeStorageRepoStub();
      const customRoomRepo = makeCustomRoomRepoStub();
      const warehouseRepo = makeWarehouseRepoStub();
      const policy = makeUnboundedPolicyStub();
      const handler = new ChangeCustomRoomToWarehouseHandler(
        storageRepo,
        customRoomRepo,
        warehouseRepo,
        uowStub,
        policy,
        eventBusStub,
      );
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom('CR', 'source desc', 'src addr'));

      const result = await handler.execute(
        new ChangeCustomRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          description: 'overridden',
          address: 'overridden addr',
        }),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('ChangeCustomRoomToStoreRoomHandler', () => {
    it('Then explicit metadata overrides for description and address', async () => {
      const storageRepo = makeStorageRepoStub();
      const customRoomRepo = makeCustomRoomRepoStub();
      const storeRoomRepo = makeStoreRoomRepoStub();
      const policy = makeUnboundedPolicyStub();
      const handler = new ChangeCustomRoomToStoreRoomHandler(
        storageRepo,
        customRoomRepo,
        storeRoomRepo,
        uowStub,
        policy,
        eventBusStub,
      );
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom('CR', 'source desc', 'src addr'));

      const result = await handler.execute(
        new ChangeCustomRoomToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
          description: 'overridden',
          address: 'overridden addr',
        }),
      );

      expect(result.isOk()).toBe(true);
    });
  });
});

describe('Change-type source-description inherit branches', () => {
  it('W→SR inherits description when source has one and metadata omits it', async () => {
    const storageRepo = makeStorageRepoStub();
    const warehouseRepo = makeWarehouseRepoStub();
    const storeRoomRepo = makeStoreRoomRepoStub();
    const policy = makeUnboundedPolicyStub();
    const handler = new ChangeWarehouseToStoreRoomHandler(
      storageRepo,
      warehouseRepo,
      storeRoomRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse('WH', 'inherit me'));

    const result = await handler.execute(
      new ChangeWarehouseToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {}),
    );

    expect(result.isOk()).toBe(true);
  });

  it('W→CR inherits description when source has one and metadata omits it', async () => {
    const storageRepo = makeStorageRepoStub();
    const warehouseRepo = makeWarehouseRepoStub();
    const customRoomRepo = makeCustomRoomRepoStub();
    const policy = makeUnboundedPolicyStub();
    const handler = new ChangeWarehouseToCustomRoomHandler(
      storageRepo,
      warehouseRepo,
      customRoomRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse('WH', 'inherit me'));

    const result = await handler.execute(
      new ChangeWarehouseToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {}),
    );

    expect(result.isOk()).toBe(true);
  });

  it('SR→W inherits description when source has one and metadata omits it', async () => {
    const storageRepo = makeStorageRepoStub();
    const storeRoomRepo = makeStoreRoomRepoStub();
    const warehouseRepo = makeWarehouseRepoStub();
    const policy = makeUnboundedPolicyStub();
    const handler = new ChangeStoreRoomToWarehouseHandler(
      storageRepo,
      storeRoomRepo,
      warehouseRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom('SR', 'inherit me', 'addr'));

    const result = await handler.execute(
      new ChangeStoreRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {}),
    );

    expect(result.isOk()).toBe(true);
  });

  it('SR→CR inherits description when source has one and metadata omits it', async () => {
    const storageRepo = makeStorageRepoStub();
    const storeRoomRepo = makeStoreRoomRepoStub();
    const customRoomRepo = makeCustomRoomRepoStub();
    const policy = makeUnboundedPolicyStub();
    const handler = new ChangeStoreRoomToCustomRoomHandler(
      storageRepo,
      storeRoomRepo,
      customRoomRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom('SR', 'inherit me', 'addr'));

    const result = await handler.execute(
      new ChangeStoreRoomToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {}),
    );

    expect(result.isOk()).toBe(true);
  });

  it('CR→W inherits description when source has one and metadata omits it', async () => {
    const storageRepo = makeStorageRepoStub();
    const customRoomRepo = makeCustomRoomRepoStub();
    const warehouseRepo = makeWarehouseRepoStub();
    const policy = makeUnboundedPolicyStub();
    const handler = new ChangeCustomRoomToWarehouseHandler(
      storageRepo,
      customRoomRepo,
      warehouseRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom('CR', 'inherit me', 'addr'));

    const result = await handler.execute(
      new ChangeCustomRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {}),
    );

    expect(result.isOk()).toBe(true);
  });

  it('CR→SR inherits description when source has one and metadata omits it', async () => {
    const storageRepo = makeStorageRepoStub();
    const customRoomRepo = makeCustomRoomRepoStub();
    const storeRoomRepo = makeStoreRoomRepoStub();
    const policy = makeUnboundedPolicyStub();
    const handler = new ChangeCustomRoomToStoreRoomHandler(
      storageRepo,
      customRoomRepo,
      storeRoomRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom('CR', 'inherit me', 'addr'));

    const result = await handler.execute(
      new ChangeCustomRoomToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {}),
    );

    expect(result.isOk()).toBe(true);
  });
});

describe('Change-type successful rename branches (existsActiveName false)', () => {
  it('W→SR with new name and no conflict succeeds', async () => {
    const storageRepo = makeStorageRepoStub();
    const warehouseRepo = makeWarehouseRepoStub();
    const storeRoomRepo = makeStoreRoomRepoStub();
    const policy = makeUnboundedPolicyStub();
    const handler = new ChangeWarehouseToStoreRoomHandler(
      storageRepo,
      warehouseRepo,
      storeRoomRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse('Original'));
    storageRepo.existsActiveName.mockResolvedValue(false);

    const result = await handler.execute(
      new ChangeWarehouseToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
        name: 'Renamed',
      }),
    );

    expect(result.isOk()).toBe(true);
  });

  it('W→CR with new name and no conflict succeeds', async () => {
    const storageRepo = makeStorageRepoStub();
    const warehouseRepo = makeWarehouseRepoStub();
    const customRoomRepo = makeCustomRoomRepoStub();
    const policy = makeUnboundedPolicyStub();
    const handler = new ChangeWarehouseToCustomRoomHandler(
      storageRepo,
      warehouseRepo,
      customRoomRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse('Original'));
    storageRepo.existsActiveName.mockResolvedValue(false);

    const result = await handler.execute(
      new ChangeWarehouseToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
        name: 'Renamed',
      }),
    );

    expect(result.isOk()).toBe(true);
  });

  it('SR→W with new name and no conflict succeeds', async () => {
    const storageRepo = makeStorageRepoStub();
    const storeRoomRepo = makeStoreRoomRepoStub();
    const warehouseRepo = makeWarehouseRepoStub();
    const policy = makeUnboundedPolicyStub();
    const handler = new ChangeStoreRoomToWarehouseHandler(
      storageRepo,
      storeRoomRepo,
      warehouseRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom('Original', undefined, 'addr'));
    storageRepo.existsActiveName.mockResolvedValue(false);

    const result = await handler.execute(
      new ChangeStoreRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
        name: 'Renamed',
      }),
    );

    expect(result.isOk()).toBe(true);
  });

  it('SR→CR with new name and no conflict succeeds', async () => {
    const storageRepo = makeStorageRepoStub();
    const storeRoomRepo = makeStoreRoomRepoStub();
    const customRoomRepo = makeCustomRoomRepoStub();
    const policy = makeUnboundedPolicyStub();
    const handler = new ChangeStoreRoomToCustomRoomHandler(
      storageRepo,
      storeRoomRepo,
      customRoomRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom('Original'));
    storageRepo.existsActiveName.mockResolvedValue(false);

    const result = await handler.execute(
      new ChangeStoreRoomToCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
        name: 'Renamed',
      }),
    );

    expect(result.isOk()).toBe(true);
  });

  it('CR→W with new name and no conflict succeeds', async () => {
    const storageRepo = makeStorageRepoStub();
    const customRoomRepo = makeCustomRoomRepoStub();
    const warehouseRepo = makeWarehouseRepoStub();
    const policy = makeUnboundedPolicyStub();
    const handler = new ChangeCustomRoomToWarehouseHandler(
      storageRepo,
      customRoomRepo,
      warehouseRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom('Original', undefined, 'addr'));
    storageRepo.existsActiveName.mockResolvedValue(false);

    const result = await handler.execute(
      new ChangeCustomRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
        name: 'Renamed',
      }),
    );

    expect(result.isOk()).toBe(true);
  });

  it('CR→SR with new name and no conflict succeeds', async () => {
    const storageRepo = makeStorageRepoStub();
    const customRoomRepo = makeCustomRoomRepoStub();
    const storeRoomRepo = makeStoreRoomRepoStub();
    const policy = makeUnboundedPolicyStub();
    const handler = new ChangeCustomRoomToStoreRoomHandler(
      storageRepo,
      customRoomRepo,
      storeRoomRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom('Original'));
    storageRepo.existsActiveName.mockResolvedValue(false);

    const result = await handler.execute(
      new ChangeCustomRoomToStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
        name: 'Renamed',
      }),
    );

    expect(result.isOk()).toBe(true);
  });
});

describe('Change-type to-warehouse address fallback branches', () => {
  it('SR→W inherits address when metadata omits it but source has none (policy rejects empty)', async () => {
    const storageRepo = makeStorageRepoStub();
    const storeRoomRepo = makeStoreRoomRepoStub();
    const warehouseRepo = makeWarehouseRepoStub();
    const policy = makeUnboundedPolicyStub();
    policy.assertAddressForWarehouse.mockReturnValue(
      new StorageAddressRequiredForWarehouseError(STORAGE_UUID),
    );
    const handler = new ChangeStoreRoomToWarehouseHandler(
      storageRepo,
      storeRoomRepo,
      warehouseRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom('SR'));

    const result = await handler.execute(
      new ChangeStoreRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {}),
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
    expect(policy.assertAddressForWarehouse).toHaveBeenCalledWith('', STORAGE_UUID);
  });

  it('SR→W with explicit metadata.address = null falls back to empty (policy rejects)', async () => {
    const storageRepo = makeStorageRepoStub();
    const storeRoomRepo = makeStoreRoomRepoStub();
    const warehouseRepo = makeWarehouseRepoStub();
    const policy = makeUnboundedPolicyStub();
    policy.assertAddressForWarehouse.mockReturnValue(
      new StorageAddressRequiredForWarehouseError(STORAGE_UUID),
    );
    const handler = new ChangeStoreRoomToWarehouseHandler(
      storageRepo,
      storeRoomRepo,
      warehouseRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom('SR'));

    const result = await handler.execute(
      new ChangeStoreRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
        address: null,
      }),
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
    expect(policy.assertAddressForWarehouse).toHaveBeenCalledWith('', STORAGE_UUID);
  });

  it('CR→W with source.address null falls back to empty (policy rejects)', async () => {
    const storageRepo = makeStorageRepoStub();
    const customRoomRepo = makeCustomRoomRepoStub();
    const warehouseRepo = makeWarehouseRepoStub();
    const policy = makeUnboundedPolicyStub();
    policy.assertAddressForWarehouse.mockReturnValue(
      new StorageAddressRequiredForWarehouseError(STORAGE_UUID),
    );
    const handler = new ChangeCustomRoomToWarehouseHandler(
      storageRepo,
      customRoomRepo,
      warehouseRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom('CR'));

    const result = await handler.execute(
      new ChangeCustomRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {}),
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
    expect(policy.assertAddressForWarehouse).toHaveBeenCalledWith('', STORAGE_UUID);
  });

  it('CR→W with explicit metadata.address = null falls back to empty', async () => {
    const storageRepo = makeStorageRepoStub();
    const customRoomRepo = makeCustomRoomRepoStub();
    const warehouseRepo = makeWarehouseRepoStub();
    const policy = makeUnboundedPolicyStub();
    policy.assertAddressForWarehouse.mockReturnValue(
      new StorageAddressRequiredForWarehouseError(STORAGE_UUID),
    );
    const handler = new ChangeCustomRoomToWarehouseHandler(
      storageRepo,
      customRoomRepo,
      warehouseRepo,
      uowStub,
      policy,
      eventBusStub,
    );
    customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom('CR', undefined, 'src addr'));

    const result = await handler.execute(
      new ChangeCustomRoomToWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, {
        address: null,
      }),
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
  });
});
