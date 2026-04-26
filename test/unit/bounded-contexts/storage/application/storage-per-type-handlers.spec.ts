import type { EventPublisher } from '@nestjs/cqrs';
import { err } from '@shared/domain/result';
import { ArchiveCustomRoomCommand } from '@storage/application/commands/archive-custom-room/archive-custom-room.command';
import { ArchiveCustomRoomHandler } from '@storage/application/commands/archive-custom-room/archive-custom-room.handler';
import { ArchiveStoreRoomCommand } from '@storage/application/commands/archive-store-room/archive-store-room.command';
import { ArchiveStoreRoomHandler } from '@storage/application/commands/archive-store-room/archive-store-room.handler';
import { ArchiveWarehouseCommand } from '@storage/application/commands/archive-warehouse/archive-warehouse.command';
import { ArchiveWarehouseHandler } from '@storage/application/commands/archive-warehouse/archive-warehouse.handler';
import { RestoreCustomRoomCommand } from '@storage/application/commands/restore-custom-room/restore-custom-room.command';
import { RestoreCustomRoomHandler } from '@storage/application/commands/restore-custom-room/restore-custom-room.handler';
import { RestoreStoreRoomCommand } from '@storage/application/commands/restore-store-room/restore-store-room.command';
import { RestoreStoreRoomHandler } from '@storage/application/commands/restore-store-room/restore-store-room.handler';
import { RestoreWarehouseCommand } from '@storage/application/commands/restore-warehouse/restore-warehouse.command';
import { RestoreWarehouseHandler } from '@storage/application/commands/restore-warehouse/restore-warehouse.handler';
import { UpdateCustomRoomCommand } from '@storage/application/commands/update-custom-room/update-custom-room.command';
import { UpdateCustomRoomHandler } from '@storage/application/commands/update-custom-room/update-custom-room.handler';
import { UpdateStoreRoomCommand } from '@storage/application/commands/update-store-room/update-store-room.command';
import { UpdateStoreRoomHandler } from '@storage/application/commands/update-store-room/update-store-room.handler';
import { UpdateWarehouseCommand } from '@storage/application/commands/update-warehouse/update-warehouse.command';
import { UpdateWarehouseHandler } from '@storage/application/commands/update-warehouse/update-warehouse.handler';
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
import { StorageAlreadyArchivedError } from '@storage/domain/errors/storage-already-archived.error';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { StorageNotArchivedError } from '@storage/domain/errors/storage-not-archived.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000099';
const STORAGE_UUID = '019538a0-0000-7000-8000-000000000010';
const STORAGE_ID = 17;

const eventPublisherStub: EventPublisher = {
  mergeObjectContext: jest.fn(<T>(aggregate: T): T => aggregate),
} as unknown as EventPublisher;

function buildWarehouse(): WarehouseAggregate {
  return WarehouseAggregate.create({
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    actorUUID: ACTOR_UUID,
    name: 'WH',
    icon: 'icon',
    color: '#000000',
    address: 'addr',
  });
}

function buildStoreRoom(): StoreRoomAggregate {
  return StoreRoomAggregate.create({
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    actorUUID: ACTOR_UUID,
    name: 'SR',
    icon: 'icon',
    color: '#000000',
  });
}

function buildCustomRoom(): CustomRoomAggregate {
  return CustomRoomAggregate.create({
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    actorUUID: ACTOR_UUID,
    name: 'CR',
    icon: 'icon',
    color: '#000000',
    roomType: 'Office',
  });
}

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
    deleteByUUID: jest.fn(),
  };
}

function makeStoreRoomRepoStub(): jest.Mocked<IStoreRoomRepository> {
  return {
    count: jest.fn().mockResolvedValue(0),
    findByUUID: jest.fn(),
    save: jest.fn().mockImplementation((agg) => Promise.resolve(agg)),
    deleteByUUID: jest.fn(),
  };
}

function makeCustomRoomRepoStub(): jest.Mocked<ICustomRoomRepository> {
  return {
    count: jest.fn().mockResolvedValue(0),
    findByUUID: jest.fn(),
    save: jest.fn().mockImplementation((agg) => Promise.resolve(agg)),
    deleteByUUID: jest.fn(),
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

// ─── Archive handlers ─────────────────────────────────────────────────────────

describe('ArchiveWarehouseHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let warehouseRepo: jest.Mocked<IWarehouseRepository>;
  let handler: ArchiveWarehouseHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    warehouseRepo = makeWarehouseRepoStub();
    handler = new ArchiveWarehouseHandler(storageRepo, warehouseRepo, eventPublisherStub);
  });

  describe('Given an active warehouse owned by the tenant', () => {
    describe('When execute is called', () => {
      it('Then it archives, persists, and returns the view', async () => {
        warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());

        const result = await handler.execute(
          new ArchiveWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(warehouseRepo.save).toHaveBeenCalled();
        expect(eventPublisherStub.mergeObjectContext).toHaveBeenCalled();
      });
    });
  });

  describe('Given the warehouse does not exist', () => {
    it('Then it returns StorageNotFoundError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ArchiveWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given the warehouse belongs to a different tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());

      const result = await handler.execute(
        new ArchiveWarehouseCommand(STORAGE_UUID, 'other-tenant', ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given the warehouse is already archived', () => {
    it('Then it surfaces the aggregate transition error', async () => {
      const aggregate = buildWarehouse();
      aggregate.markArchived(ACTOR_UUID);
      warehouseRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new ArchiveWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyArchivedError);
    });
  });

  describe('Given the storage container has no id for the tenant', () => {
    it('Then it returns StorageNotFoundError before saving', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ArchiveWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      expect(warehouseRepo.save).not.toHaveBeenCalled();
    });
  });
});

describe('ArchiveStoreRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let storeRoomRepo: jest.Mocked<IStoreRoomRepository>;
  let handler: ArchiveStoreRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    storeRoomRepo = makeStoreRoomRepoStub();
    handler = new ArchiveStoreRoomHandler(storageRepo, storeRoomRepo, eventPublisherStub);
  });

  describe('Given an active store-room owned by the tenant', () => {
    it('Then it archives and persists the new state', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());

      const result = await handler.execute(
        new ArchiveStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result.isOk()).toBe(true);
      expect(storeRoomRepo.save).toHaveBeenCalled();
    });
  });

  describe('Given the store-room is missing', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ArchiveStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a store-room from another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());

      const result = await handler.execute(
        new ArchiveStoreRoomCommand(STORAGE_UUID, 'other', ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a store-room already archived', () => {
    it('Then it surfaces StorageAlreadyArchivedError', async () => {
      const aggregate = buildStoreRoom();
      aggregate.markArchived(ACTOR_UUID);
      storeRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new ArchiveStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyArchivedError);
    });
  });

  describe('Given the storage container has no id for the tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ArchiveStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});

describe('ArchiveCustomRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let customRoomRepo: jest.Mocked<ICustomRoomRepository>;
  let handler: ArchiveCustomRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    customRoomRepo = makeCustomRoomRepoStub();
    handler = new ArchiveCustomRoomHandler(storageRepo, customRoomRepo, eventPublisherStub);
  });

  describe('Given an active custom-room', () => {
    it('Then it archives and persists', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());

      const result = await handler.execute(
        new ArchiveCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Given the custom-room is missing', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ArchiveCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a custom-room owned by another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());

      const result = await handler.execute(
        new ArchiveCustomRoomCommand(STORAGE_UUID, 'other', ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given the custom-room is already archived', () => {
    it('Then it returns StorageAlreadyArchivedError', async () => {
      const aggregate = buildCustomRoom();
      aggregate.markArchived(ACTOR_UUID);
      customRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new ArchiveCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyArchivedError);
    });
  });

  describe('Given the storage container has no id', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new ArchiveCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});

// ─── Restore handlers ─────────────────────────────────────────────────────────

describe('RestoreWarehouseHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let warehouseRepo: jest.Mocked<IWarehouseRepository>;
  let policy: jest.Mocked<StorageTypeChangePolicy>;
  let handler: RestoreWarehouseHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    warehouseRepo = makeWarehouseRepoStub();
    policy = makeUnboundedPolicyStub();
    handler = new RestoreWarehouseHandler(storageRepo, warehouseRepo, policy, eventPublisherStub);
  });

  describe('Given an archived warehouse and a tenant within tier limits', () => {
    it('Then it restores and persists', async () => {
      const aggregate = buildWarehouse();
      aggregate.markArchived(ACTOR_UUID);
      warehouseRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new RestoreWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Given the warehouse is missing', () => {
    it('Then it returns StorageNotFoundError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new RestoreWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given the warehouse belongs to another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());

      const result = await handler.execute(
        new RestoreWarehouseCommand(STORAGE_UUID, 'other', ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given the tenant has downgraded below the current warehouse count', () => {
    it('Then it returns WarehouseRequiresTierUpgradeError', async () => {
      const aggregate = buildWarehouse();
      aggregate.markArchived(ACTOR_UUID);
      warehouseRepo.findByUUID.mockResolvedValue(aggregate);
      policy.assertWarehouseCanRestore.mockResolvedValue(new WarehouseRequiresTierUpgradeError());

      const result = await handler.execute(
        new RestoreWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
    });
  });

  describe('Given the warehouse is ACTIVE (not archived)', () => {
    it('Then it returns StorageNotArchivedError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());

      const result = await handler.execute(
        new RestoreWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotArchivedError);
    });
  });

  describe('Given the storage container id cannot be resolved', () => {
    it('Then it returns StorageNotFoundError before saving', async () => {
      const aggregate = buildWarehouse();
      aggregate.markArchived(ACTOR_UUID);
      warehouseRepo.findByUUID.mockResolvedValue(aggregate);
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new RestoreWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      expect(warehouseRepo.save).not.toHaveBeenCalled();
    });
  });
});

describe('RestoreStoreRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let storeRoomRepo: jest.Mocked<IStoreRoomRepository>;
  let policy: jest.Mocked<StorageTypeChangePolicy>;
  let handler: RestoreStoreRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    storeRoomRepo = makeStoreRoomRepoStub();
    policy = makeUnboundedPolicyStub();
    handler = new RestoreStoreRoomHandler(storageRepo, storeRoomRepo, policy, eventPublisherStub);
  });

  describe('Given an archived store-room within tier limits', () => {
    it('Then it restores it', async () => {
      const aggregate = buildStoreRoom();
      aggregate.markArchived(ACTOR_UUID);
      storeRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new RestoreStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Given the store-room is missing', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new RestoreStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given the store-room belongs to another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());

      const result = await handler.execute(
        new RestoreStoreRoomCommand(STORAGE_UUID, 'other', ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a downgraded tenant exceeding the store-room limit', () => {
    it('Then it returns StoreRoomLimitReachedError', async () => {
      const aggregate = buildStoreRoom();
      aggregate.markArchived(ACTOR_UUID);
      storeRoomRepo.findByUUID.mockResolvedValue(aggregate);
      policy.assertStoreRoomCanRestore.mockResolvedValue(new StoreRoomLimitReachedError());

      const result = await handler.execute(
        new RestoreStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StoreRoomLimitReachedError);
    });
  });

  describe('Given a non-archived store-room', () => {
    it('Then it returns StorageNotArchivedError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());

      const result = await handler.execute(
        new RestoreStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotArchivedError);
    });
  });

  describe('Given the storage container id cannot be resolved', () => {
    it('Then it returns StorageNotFoundError', async () => {
      const aggregate = buildStoreRoom();
      aggregate.markArchived(ACTOR_UUID);
      storeRoomRepo.findByUUID.mockResolvedValue(aggregate);
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new RestoreStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});

describe('RestoreCustomRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let customRoomRepo: jest.Mocked<ICustomRoomRepository>;
  let policy: jest.Mocked<StorageTypeChangePolicy>;
  let handler: RestoreCustomRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    customRoomRepo = makeCustomRoomRepoStub();
    policy = makeUnboundedPolicyStub();
    handler = new RestoreCustomRoomHandler(storageRepo, customRoomRepo, policy, eventPublisherStub);
  });

  describe('Given an archived custom-room within tier limits', () => {
    it('Then it restores it', async () => {
      const aggregate = buildCustomRoom();
      aggregate.markArchived(ACTOR_UUID);
      customRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new RestoreCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Given the custom-room is missing', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new RestoreCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given the custom-room belongs to another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());

      const result = await handler.execute(
        new RestoreCustomRoomCommand(STORAGE_UUID, 'other', ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a downgraded tenant exceeding the custom-room limit', () => {
    it('Then it returns CustomRoomLimitReachedError', async () => {
      const aggregate = buildCustomRoom();
      aggregate.markArchived(ACTOR_UUID);
      customRoomRepo.findByUUID.mockResolvedValue(aggregate);
      policy.assertCustomRoomCanRestore.mockResolvedValue(new CustomRoomLimitReachedError());

      const result = await handler.execute(
        new RestoreCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(CustomRoomLimitReachedError);
    });
  });

  describe('Given a non-archived custom-room', () => {
    it('Then it returns StorageNotArchivedError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());

      const result = await handler.execute(
        new RestoreCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotArchivedError);
    });
  });

  describe('Given the storage container id cannot be resolved', () => {
    it('Then it returns StorageNotFoundError', async () => {
      const aggregate = buildCustomRoom();
      aggregate.markArchived(ACTOR_UUID);
      customRoomRepo.findByUUID.mockResolvedValue(aggregate);
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new RestoreCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});

// ─── Update handlers ──────────────────────────────────────────────────────────

describe('UpdateWarehouseHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let warehouseRepo: jest.Mocked<IWarehouseRepository>;
  let handler: UpdateWarehouseHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    warehouseRepo = makeWarehouseRepoStub();
    handler = new UpdateWarehouseHandler(storageRepo, warehouseRepo, eventPublisherStub);
  });

  describe('Given an existing warehouse and a unique new name', () => {
    it('Then it persists the renamed aggregate', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());

      const result = await handler.execute(
        new UpdateWarehouseCommand(
          STORAGE_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          'New Name',
          'description text',
          'new addr',
        ),
      );

      expect(result.isOk()).toBe(true);
      expect(warehouseRepo.save).toHaveBeenCalled();
    });
  });

  describe('Given the warehouse is missing', () => {
    it('Then it returns StorageNotFoundError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new UpdateWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, 'X'),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given the warehouse belongs to another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());

      const result = await handler.execute(
        new UpdateWarehouseCommand(STORAGE_UUID, 'other', ACTOR_UUID, 'X'),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a name that is already taken in the tenant', () => {
    it('Then it returns StorageNameAlreadyExistsError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());
      storageRepo.existsActiveName.mockResolvedValue(true);

      const result = await handler.execute(
        new UpdateWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, 'Conflicts'),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
    });
  });

  describe('Given an empty address (only whitespace)', () => {
    it('Then it returns StorageAddressRequiredForWarehouseError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());

      const result = await handler.execute(
        new UpdateWarehouseCommand(
          STORAGE_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          undefined,
          undefined,
          '   ',
        ),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
    });
  });

  describe('Given the storage container id is unresolved', () => {
    it('Then it returns StorageNotFoundError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new UpdateWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, 'X'),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given an update with no name change (same as current)', () => {
    it('Then it skips the name uniqueness check', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());

      const result = await handler.execute(
        new UpdateWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, 'WH'),
      );

      expect(result.isOk()).toBe(true);
      expect(storageRepo.existsActiveName).not.toHaveBeenCalled();
    });
  });

  describe('Given the aggregate.update transition fails (defensive guard)', () => {
    it('Then the handler returns the surfaced domain exception', async () => {
      const aggregate = buildWarehouse();
      const failure = new StorageNotFoundError(STORAGE_UUID);
      jest.spyOn(aggregate, 'update').mockReturnValue(err(failure));
      warehouseRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new UpdateWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, 'New'),
      );

      expect(result._unsafeUnwrapErr()).toBe(failure);
      expect(warehouseRepo.save).not.toHaveBeenCalled();
    });
  });
});

describe('UpdateStoreRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let storeRoomRepo: jest.Mocked<IStoreRoomRepository>;
  let handler: UpdateStoreRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    storeRoomRepo = makeStoreRoomRepoStub();
    handler = new UpdateStoreRoomHandler(storageRepo, storeRoomRepo, eventPublisherStub);
  });

  describe('Given a unique rename for an existing store-room', () => {
    it('Then it persists the change', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());

      const result = await handler.execute(
        new UpdateStoreRoomCommand(
          STORAGE_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          'Renamed',
          'description text',
          'addr',
        ),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Given the store-room is missing', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new UpdateStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, 'X'),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a store-room owned by another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());

      const result = await handler.execute(
        new UpdateStoreRoomCommand(STORAGE_UUID, 'other', ACTOR_UUID, 'X'),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given the new name is already in use', () => {
    it('Then it returns StorageNameAlreadyExistsError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());
      storageRepo.existsActiveName.mockResolvedValue(true);

      const result = await handler.execute(
        new UpdateStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, 'Taken'),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
    });
  });

  describe('Given the storage container id is unresolved', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new UpdateStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, 'X'),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given an update with the same name as the current store-room', () => {
    it('Then it skips the name uniqueness check', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());

      const result = await handler.execute(
        new UpdateStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, 'SR'),
      );

      expect(result.isOk()).toBe(true);
      expect(storageRepo.existsActiveName).not.toHaveBeenCalled();
    });
  });

  describe('Given the aggregate.update transition fails (defensive guard)', () => {
    it('Then the handler returns the surfaced domain exception', async () => {
      const aggregate = buildStoreRoom();
      const failure = new StorageNotFoundError(STORAGE_UUID);
      jest.spyOn(aggregate, 'update').mockReturnValue(err(failure));
      storeRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new UpdateStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, 'New'),
      );

      expect(result._unsafeUnwrapErr()).toBe(failure);
      expect(storeRoomRepo.save).not.toHaveBeenCalled();
    });
  });
});

describe('UpdateCustomRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let customRoomRepo: jest.Mocked<ICustomRoomRepository>;
  let handler: UpdateCustomRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    customRoomRepo = makeCustomRoomRepoStub();
    handler = new UpdateCustomRoomHandler(storageRepo, customRoomRepo, eventPublisherStub);
  });

  describe('Given a unique rename for an existing custom-room', () => {
    it('Then it persists the change', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());

      const result = await handler.execute(
        new UpdateCustomRoomCommand(
          STORAGE_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          'Renamed',
          'description text',
          'icon',
          '#aabbcc',
          'addr',
          'Server Closet',
        ),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Given the custom-room is missing', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new UpdateCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, 'X'),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a custom-room owned by another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());

      const result = await handler.execute(
        new UpdateCustomRoomCommand(STORAGE_UUID, 'other', ACTOR_UUID, 'X'),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given the new name is already in use', () => {
    it('Then it returns StorageNameAlreadyExistsError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());
      storageRepo.existsActiveName.mockResolvedValue(true);

      const result = await handler.execute(
        new UpdateCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, 'Taken'),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
    });
  });

  describe('Given the storage container id is unresolved', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new UpdateCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, 'X'),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given an update with the same name as the current custom-room', () => {
    it('Then it skips the name uniqueness check', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());

      const result = await handler.execute(
        new UpdateCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, 'CR'),
      );

      expect(result.isOk()).toBe(true);
      expect(storageRepo.existsActiveName).not.toHaveBeenCalled();
    });
  });

  describe('Given the aggregate.update transition fails (defensive guard)', () => {
    it('Then the handler returns the surfaced domain exception', async () => {
      const aggregate = buildCustomRoom();
      const failure = new StorageNotFoundError(STORAGE_UUID);
      jest.spyOn(aggregate, 'update').mockReturnValue(err(failure));
      customRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new UpdateCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID, 'New'),
      );

      expect(result._unsafeUnwrapErr()).toBe(failure);
      expect(customRoomRepo.save).not.toHaveBeenCalled();
    });
  });
});
