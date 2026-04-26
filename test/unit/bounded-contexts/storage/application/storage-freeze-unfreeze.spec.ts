import type { EventPublisher } from '@nestjs/cqrs';
import { FreezeCustomRoomCommand } from '@storage/application/commands/freeze-custom-room/freeze-custom-room.command';
import { FreezeCustomRoomHandler } from '@storage/application/commands/freeze-custom-room/freeze-custom-room.handler';
import { FreezeStoreRoomCommand } from '@storage/application/commands/freeze-store-room/freeze-store-room.command';
import { FreezeStoreRoomHandler } from '@storage/application/commands/freeze-store-room/freeze-store-room.handler';
import { FreezeWarehouseCommand } from '@storage/application/commands/freeze-warehouse/freeze-warehouse.command';
import { FreezeWarehouseHandler } from '@storage/application/commands/freeze-warehouse/freeze-warehouse.handler';
import { UnfreezeCustomRoomCommand } from '@storage/application/commands/unfreeze-custom-room/unfreeze-custom-room.command';
import { UnfreezeCustomRoomHandler } from '@storage/application/commands/unfreeze-custom-room/unfreeze-custom-room.handler';
import { UnfreezeStoreRoomCommand } from '@storage/application/commands/unfreeze-store-room/unfreeze-store-room.command';
import { UnfreezeStoreRoomHandler } from '@storage/application/commands/unfreeze-store-room/unfreeze-store-room.handler';
import { UnfreezeWarehouseCommand } from '@storage/application/commands/unfreeze-warehouse/unfreeze-warehouse.command';
import { UnfreezeWarehouseHandler } from '@storage/application/commands/unfreeze-warehouse/unfreeze-warehouse.handler';
import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';
import { StoreRoomAggregate } from '@storage/domain/aggregates/store-room.aggregate';
import { WarehouseAggregate } from '@storage/domain/aggregates/warehouse.aggregate';
import type { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import type { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import type { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import type { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageAlreadyFrozenError } from '@storage/domain/errors/storage-already-frozen.error';
import { StorageArchivedCannotBeFrozenError } from '@storage/domain/errors/storage-archived-cannot-be-frozen.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageNotFrozenError } from '@storage/domain/errors/storage-not-frozen.error';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000099';
const STORAGE_UUID = '019538a0-0000-7000-8000-000000000010';
const STORAGE_ID = 17;

const eventPublisherStub: EventPublisher = {
  mergeObjectContext: jest.fn(<T>(aggregate: T): T => aggregate),
} as unknown as EventPublisher;

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

// ─── Freeze handlers ──────────────────────────────────────────────────────────

describe('FreezeWarehouseHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let warehouseRepo: jest.Mocked<IWarehouseRepository>;
  let handler: FreezeWarehouseHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    warehouseRepo = makeWarehouseRepoStub();
    handler = new FreezeWarehouseHandler(storageRepo, warehouseRepo, eventPublisherStub);
  });

  describe('Given an active warehouse owned by the tenant', () => {
    it('Then it freezes and persists', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());

      const result = await handler.execute(
        new FreezeWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result.isOk()).toBe(true);
      expect(warehouseRepo.save).toHaveBeenCalled();
    });
  });

  describe('Given a missing warehouse', () => {
    it('Then it returns StorageNotFoundError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new FreezeWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a warehouse from another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());

      const result = await handler.execute(
        new FreezeWarehouseCommand(STORAGE_UUID, 'other', ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a warehouse already frozen', () => {
    it('Then it returns StorageAlreadyFrozenError', async () => {
      const aggregate = buildWarehouse();
      aggregate.markFrozen(ACTOR_UUID);
      warehouseRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new FreezeWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyFrozenError);
    });
  });

  describe('Given an archived warehouse (cannot be frozen)', () => {
    it('Then it returns StorageArchivedCannotBeFrozenError', async () => {
      const aggregate = buildWarehouse();
      aggregate.markArchived(ACTOR_UUID);
      warehouseRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new FreezeWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageArchivedCannotBeFrozenError);
    });
  });

  describe('Given the storage container id is unresolved', () => {
    it('Then it returns StorageNotFoundError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new FreezeWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});

describe('FreezeStoreRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let storeRoomRepo: jest.Mocked<IStoreRoomRepository>;
  let handler: FreezeStoreRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    storeRoomRepo = makeStoreRoomRepoStub();
    handler = new FreezeStoreRoomHandler(storageRepo, storeRoomRepo, eventPublisherStub);
  });

  describe('Given an active store-room owned by the tenant', () => {
    it('Then it freezes and persists', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());

      const result = await handler.execute(
        new FreezeStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Given the store-room is missing', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new FreezeStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a store-room from another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());

      const result = await handler.execute(
        new FreezeStoreRoomCommand(STORAGE_UUID, 'other', ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a store-room already frozen', () => {
    it('Then it returns StorageAlreadyFrozenError', async () => {
      const aggregate = buildStoreRoom();
      aggregate.markFrozen(ACTOR_UUID);
      storeRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new FreezeStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyFrozenError);
    });
  });

  describe('Given an archived store-room', () => {
    it('Then it returns StorageArchivedCannotBeFrozenError', async () => {
      const aggregate = buildStoreRoom();
      aggregate.markArchived(ACTOR_UUID);
      storeRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new FreezeStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageArchivedCannotBeFrozenError);
    });
  });

  describe('Given the storage container id is unresolved', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new FreezeStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});

describe('FreezeCustomRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let customRoomRepo: jest.Mocked<ICustomRoomRepository>;
  let handler: FreezeCustomRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    customRoomRepo = makeCustomRoomRepoStub();
    handler = new FreezeCustomRoomHandler(storageRepo, customRoomRepo, eventPublisherStub);
  });

  describe('Given an active custom-room owned by the tenant', () => {
    it('Then it freezes and persists', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());

      const result = await handler.execute(
        new FreezeCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Given a missing custom-room', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new FreezeCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a custom-room from another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());

      const result = await handler.execute(
        new FreezeCustomRoomCommand(STORAGE_UUID, 'other', ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a custom-room already frozen', () => {
    it('Then it returns StorageAlreadyFrozenError', async () => {
      const aggregate = buildCustomRoom();
      aggregate.markFrozen(ACTOR_UUID);
      customRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new FreezeCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyFrozenError);
    });
  });

  describe('Given an archived custom-room', () => {
    it('Then it returns StorageArchivedCannotBeFrozenError', async () => {
      const aggregate = buildCustomRoom();
      aggregate.markArchived(ACTOR_UUID);
      customRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new FreezeCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageArchivedCannotBeFrozenError);
    });
  });

  describe('Given the storage container id is unresolved', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new FreezeCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});

// ─── Unfreeze handlers ────────────────────────────────────────────────────────

describe('UnfreezeWarehouseHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let warehouseRepo: jest.Mocked<IWarehouseRepository>;
  let handler: UnfreezeWarehouseHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    warehouseRepo = makeWarehouseRepoStub();
    handler = new UnfreezeWarehouseHandler(storageRepo, warehouseRepo, eventPublisherStub);
  });

  describe('Given a frozen warehouse', () => {
    it('Then it unfreezes and persists', async () => {
      const aggregate = buildWarehouse();
      aggregate.markFrozen(ACTOR_UUID);
      warehouseRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new UnfreezeWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Given a missing warehouse', () => {
    it('Then it returns StorageNotFoundError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new UnfreezeWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a warehouse from another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      const aggregate = buildWarehouse();
      aggregate.markFrozen(ACTOR_UUID);
      warehouseRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new UnfreezeWarehouseCommand(STORAGE_UUID, 'other', ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a warehouse that is not frozen', () => {
    it('Then it returns StorageNotFrozenError', async () => {
      warehouseRepo.findByUUID.mockResolvedValue(buildWarehouse());

      const result = await handler.execute(
        new UnfreezeWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFrozenError);
    });
  });

  describe('Given the storage container id is unresolved', () => {
    it('Then it returns StorageNotFoundError', async () => {
      const aggregate = buildWarehouse();
      aggregate.markFrozen(ACTOR_UUID);
      warehouseRepo.findByUUID.mockResolvedValue(aggregate);
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new UnfreezeWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});

describe('UnfreezeStoreRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let storeRoomRepo: jest.Mocked<IStoreRoomRepository>;
  let handler: UnfreezeStoreRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    storeRoomRepo = makeStoreRoomRepoStub();
    handler = new UnfreezeStoreRoomHandler(storageRepo, storeRoomRepo, eventPublisherStub);
  });

  describe('Given a frozen store-room', () => {
    it('Then it unfreezes', async () => {
      const aggregate = buildStoreRoom();
      aggregate.markFrozen(ACTOR_UUID);
      storeRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new UnfreezeStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Given the store-room is missing', () => {
    it('Then it returns StorageNotFoundError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new UnfreezeStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a store-room from another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      const aggregate = buildStoreRoom();
      aggregate.markFrozen(ACTOR_UUID);
      storeRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new UnfreezeStoreRoomCommand(STORAGE_UUID, 'other', ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a non-frozen store-room', () => {
    it('Then it returns StorageNotFrozenError', async () => {
      storeRoomRepo.findByUUID.mockResolvedValue(buildStoreRoom());

      const result = await handler.execute(
        new UnfreezeStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFrozenError);
    });
  });

  describe('Given the storage container id is unresolved', () => {
    it('Then it returns StorageNotFoundError', async () => {
      const aggregate = buildStoreRoom();
      aggregate.markFrozen(ACTOR_UUID);
      storeRoomRepo.findByUUID.mockResolvedValue(aggregate);
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new UnfreezeStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});

describe('UnfreezeCustomRoomHandler', () => {
  let storageRepo: jest.Mocked<IStorageRepository>;
  let customRoomRepo: jest.Mocked<ICustomRoomRepository>;
  let handler: UnfreezeCustomRoomHandler;

  beforeEach(() => {
    storageRepo = makeStorageRepoStub();
    customRoomRepo = makeCustomRoomRepoStub();
    handler = new UnfreezeCustomRoomHandler(storageRepo, customRoomRepo, eventPublisherStub);
  });

  describe('Given a frozen custom-room', () => {
    it('Then it unfreezes', async () => {
      const aggregate = buildCustomRoom();
      aggregate.markFrozen(ACTOR_UUID);
      customRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new UnfreezeCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Given the custom-room is missing', () => {
    it('Then it returns StorageNotFoundError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new UnfreezeCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a custom-room from another tenant', () => {
    it('Then it returns StorageNotFoundError', async () => {
      const aggregate = buildCustomRoom();
      aggregate.markFrozen(ACTOR_UUID);
      customRoomRepo.findByUUID.mockResolvedValue(aggregate);

      const result = await handler.execute(
        new UnfreezeCustomRoomCommand(STORAGE_UUID, 'other', ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });

  describe('Given a non-frozen custom-room', () => {
    it('Then it returns StorageNotFrozenError', async () => {
      customRoomRepo.findByUUID.mockResolvedValue(buildCustomRoom());

      const result = await handler.execute(
        new UnfreezeCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFrozenError);
    });
  });

  describe('Given the storage container id is unresolved', () => {
    it('Then it returns StorageNotFoundError', async () => {
      const aggregate = buildCustomRoom();
      aggregate.markFrozen(ACTOR_UUID);
      customRoomRepo.findByUUID.mockResolvedValue(aggregate);
      storageRepo.findIdByTenantUUID.mockResolvedValue(null);

      const result = await handler.execute(
        new UnfreezeCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});
