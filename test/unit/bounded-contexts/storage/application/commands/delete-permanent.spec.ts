import type { EventPublisher } from '@nestjs/cqrs';
import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';
import { StoreRoomAggregate } from '@storage/domain/aggregates/store-room.aggregate';
import { WarehouseAggregate } from '@storage/domain/aggregates/warehouse.aggregate';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageNotArchivedError } from '@storage/domain/errors/storage-not-archived.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { DeletePermanentCustomRoomCommand } from '@storage/application/commands/delete-permanent-custom-room/delete-permanent-custom-room.command';
import { DeletePermanentCustomRoomHandler } from '@storage/application/commands/delete-permanent-custom-room/delete-permanent-custom-room.handler';
import { DeletePermanentStoreRoomCommand } from '@storage/application/commands/delete-permanent-store-room/delete-permanent-store-room.command';
import { DeletePermanentStoreRoomHandler } from '@storage/application/commands/delete-permanent-store-room/delete-permanent-store-room.handler';
import { DeletePermanentWarehouseCommand } from '@storage/application/commands/delete-permanent-warehouse/delete-permanent-warehouse.command';
import { DeletePermanentWarehouseHandler } from '@storage/application/commands/delete-permanent-warehouse/delete-permanent-warehouse.handler';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000099';
const STORAGE_UUID = '019538a0-0000-7000-8000-000000000010';

function buildArchivedWarehouse(): WarehouseAggregate {
  const aggregate = WarehouseAggregate.create({
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    actorUUID: ACTOR_UUID,
    name: 'WH',
    icon: 'icon',
    color: '#000000',
    address: 'addr',
  });
  aggregate.markArchived(ACTOR_UUID);
  return aggregate;
}

function buildArchivedStoreRoom(): StoreRoomAggregate {
  const aggregate = StoreRoomAggregate.create({
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    actorUUID: ACTOR_UUID,
    name: 'SR',
    icon: 'icon',
    color: '#000000',
  });
  aggregate.markArchived(ACTOR_UUID);
  return aggregate;
}

function buildArchivedCustomRoom(): CustomRoomAggregate {
  const aggregate = CustomRoomAggregate.create({
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    actorUUID: ACTOR_UUID,
    name: 'CR',
    icon: 'icon',
    color: '#000000',
    roomType: 'Office',
  });
  aggregate.markArchived(ACTOR_UUID);
  return aggregate;
}

const eventPublisherStub: EventPublisher = {
  mergeObjectContext: jest.fn(<T>(aggregate: T): T => aggregate),
} as unknown as EventPublisher;

// ─── Warehouse ────────────────────────────────────────────────────────────────

describe('DeletePermanentWarehouseHandler', () => {
  let warehouseRepo: jest.Mocked<IWarehouseRepository>;
  let handler: DeletePermanentWarehouseHandler;

  beforeEach(() => {
    warehouseRepo = {
      count: jest.fn(),
      findByUUID: jest.fn(),
      save: jest.fn(),
      deleteByUUID: jest.fn().mockResolvedValue(undefined),
    };
    handler = new DeletePermanentWarehouseHandler(warehouseRepo, eventPublisherStub);
  });

  describe('Given an archived warehouse owned by the tenant', () => {
    describe('When execute is called', () => {
      it('Then it succeeds, deletes the row, and merges the aggregate context for event publishing', async () => {
        const aggregate = buildArchivedWarehouse();
        warehouseRepo.findByUUID.mockResolvedValue(aggregate);

        const command = new DeletePermanentWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID);

        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(warehouseRepo.deleteByUUID).toHaveBeenCalledWith(STORAGE_UUID);
        expect(eventPublisherStub.mergeObjectContext).toHaveBeenCalledWith(aggregate);
      });
    });
  });

  describe('Given a warehouse that does not exist', () => {
    describe('When execute is called', () => {
      it('Then it returns StorageNotFoundError without deleting anything', async () => {
        warehouseRepo.findByUUID.mockResolvedValue(null);

        const command = new DeletePermanentWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID);

        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
        expect(warehouseRepo.deleteByUUID).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a warehouse owned by a different tenant', () => {
    describe('When execute is called', () => {
      it('Then it returns StorageNotFoundError (tenant isolation)', async () => {
        const aggregate = buildArchivedWarehouse();
        warehouseRepo.findByUUID.mockResolvedValue(aggregate);

        const otherTenant = '019538a0-0000-7000-8000-000000000002';
        const command = new DeletePermanentWarehouseCommand(STORAGE_UUID, otherTenant, ACTOR_UUID);

        const result = await handler.execute(command);

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
        expect(warehouseRepo.deleteByUUID).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given an ACTIVE warehouse (not archived)', () => {
    describe('When execute is called', () => {
      it('Then it returns StorageNotArchivedError without deleting', async () => {
        const aggregate = WarehouseAggregate.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'WH',
          icon: 'icon',
          color: '#000000',
          address: 'addr',
        });
        warehouseRepo.findByUUID.mockResolvedValue(aggregate);

        const command = new DeletePermanentWarehouseCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID);

        const result = await handler.execute(command);

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotArchivedError);
        expect(warehouseRepo.deleteByUUID).not.toHaveBeenCalled();
      });
    });
  });
});

// ─── StoreRoom ────────────────────────────────────────────────────────────────

describe('DeletePermanentStoreRoomHandler', () => {
  let storeRoomRepo: jest.Mocked<IStoreRoomRepository>;
  let handler: DeletePermanentStoreRoomHandler;

  beforeEach(() => {
    storeRoomRepo = {
      count: jest.fn(),
      findByUUID: jest.fn(),
      save: jest.fn(),
      deleteByUUID: jest.fn().mockResolvedValue(undefined),
    };
    handler = new DeletePermanentStoreRoomHandler(storeRoomRepo, eventPublisherStub);
  });

  describe('Given an archived store-room owned by the tenant', () => {
    describe('When execute is called', () => {
      it('Then it succeeds and deletes the row', async () => {
        const aggregate = buildArchivedStoreRoom();
        storeRoomRepo.findByUUID.mockResolvedValue(aggregate);

        const result = await handler.execute(
          new DeletePermanentStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(storeRoomRepo.deleteByUUID).toHaveBeenCalledWith(STORAGE_UUID);
      });
    });
  });

  describe('Given a missing store-room', () => {
    describe('When execute is called', () => {
      it('Then it returns StorageNotFoundError', async () => {
        storeRoomRepo.findByUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new DeletePermanentStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given a store-room from another tenant', () => {
    describe('When execute is called', () => {
      it('Then it returns StorageNotFoundError', async () => {
        const aggregate = buildArchivedStoreRoom();
        storeRoomRepo.findByUUID.mockResolvedValue(aggregate);

        const result = await handler.execute(
          new DeletePermanentStoreRoomCommand(STORAGE_UUID, 'other-tenant-uuid', ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given an ACTIVE store-room', () => {
    describe('When execute is called', () => {
      it('Then it returns StorageNotArchivedError', async () => {
        const aggregate = StoreRoomAggregate.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'SR',
          icon: 'icon',
          color: '#000000',
        });
        storeRoomRepo.findByUUID.mockResolvedValue(aggregate);

        const result = await handler.execute(
          new DeletePermanentStoreRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotArchivedError);
      });
    });
  });
});

// ─── CustomRoom ───────────────────────────────────────────────────────────────

describe('DeletePermanentCustomRoomHandler', () => {
  let customRoomRepo: jest.Mocked<ICustomRoomRepository>;
  let handler: DeletePermanentCustomRoomHandler;

  beforeEach(() => {
    customRoomRepo = {
      count: jest.fn(),
      findByUUID: jest.fn(),
      save: jest.fn(),
      deleteByUUID: jest.fn().mockResolvedValue(undefined),
    };
    handler = new DeletePermanentCustomRoomHandler(customRoomRepo, eventPublisherStub);
  });

  describe('Given an archived custom-room owned by the tenant', () => {
    describe('When execute is called', () => {
      it('Then it succeeds and deletes the row', async () => {
        const aggregate = buildArchivedCustomRoom();
        customRoomRepo.findByUUID.mockResolvedValue(aggregate);

        const result = await handler.execute(
          new DeletePermanentCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(customRoomRepo.deleteByUUID).toHaveBeenCalledWith(STORAGE_UUID);
      });
    });
  });

  describe('Given a missing custom-room', () => {
    describe('When execute is called', () => {
      it('Then it returns StorageNotFoundError', async () => {
        customRoomRepo.findByUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new DeletePermanentCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given a custom-room from another tenant', () => {
    describe('When execute is called', () => {
      it('Then it returns StorageNotFoundError', async () => {
        const aggregate = buildArchivedCustomRoom();
        customRoomRepo.findByUUID.mockResolvedValue(aggregate);

        const result = await handler.execute(
          new DeletePermanentCustomRoomCommand(STORAGE_UUID, 'other-tenant-uuid', ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given an ACTIVE custom-room', () => {
    describe('When execute is called', () => {
      it('Then it returns StorageNotArchivedError', async () => {
        const aggregate = CustomRoomAggregate.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'CR',
          icon: 'icon',
          color: '#000000',
          roomType: 'Office',
        });
        customRoomRepo.findByUUID.mockResolvedValue(aggregate);

        const result = await handler.execute(
          new DeletePermanentCustomRoomCommand(STORAGE_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotArchivedError);
      });
    });
  });
});
