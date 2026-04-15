import { EventBus } from '@nestjs/cqrs';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
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
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StorageAlreadyFrozenError } from '@storage/domain/errors/storage-already-frozen.error';
import { StorageArchivedCannotBeFrozenError } from '@storage/domain/errors/storage-archived-cannot-be-frozen.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageNotFrozenError } from '@storage/domain/errors/storage-not-frozen.error';
import { StorageFrozenEvent } from '@storage/domain/events/storage-frozen.event';
import { StorageReactivatedEvent } from '@storage/domain/events/storage-reactivated.event';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const OTHER_TENANT_UUID = '019538a0-0000-7000-8000-000000000002';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000099';
const WH_UUID = '019538a0-0000-7000-8000-000000000010';
const SR_UUID = '019538a0-0000-7000-8000-000000000020';
const CR_UUID = '019538a0-0000-7000-8000-000000000030';

function makeWarehouse(
  overrides: Partial<{ archivedAt: Date | null; frozenAt: Date | null; tenantUUID: string }> = {},
): WarehouseModel {
  return WarehouseModel.reconstitute({
    id: 1,
    uuid: new UUIDVO(WH_UUID),
    tenantUUID: overrides.tenantUUID ?? TENANT_UUID,
    name: new StorageNameVO('WH'),
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
  overrides: Partial<{ archivedAt: Date | null; frozenAt: Date | null; tenantUUID: string }> = {},
): StoreRoomModel {
  return StoreRoomModel.reconstitute({
    id: 2,
    uuid: new UUIDVO(SR_UUID),
    tenantUUID: overrides.tenantUUID ?? TENANT_UUID,
    name: new StorageNameVO('SR'),
    description: null,
    icon: new StorageIconVO('inventory_2'),
    color: new StorageColorVO('#d97706'),
    address: new StorageAddressVO('456 Oak'),
    archivedAt: overrides.archivedAt ?? null,
    frozenAt: overrides.frozenAt ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeCustomRoom(
  overrides: Partial<{ archivedAt: Date | null; frozenAt: Date | null; tenantUUID: string }> = {},
): CustomRoomModel {
  return CustomRoomModel.reconstitute({
    id: 3,
    uuid: new UUIDVO(CR_UUID),
    tenantUUID: overrides.tenantUUID ?? TENANT_UUID,
    name: StorageNameVO.create('CR'),
    description: null,
    icon: StorageIconVO.create('coffee'),
    color: StorageColorVO.create('#6b7280'),
    roomType: RoomTypeNameVO.create('Office'),
    address: StorageAddressVO.create('123 Main'),
    archivedAt: overrides.archivedAt ?? null,
    frozenAt: overrides.frozenAt ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

let storageRepository: jest.Mocked<IStorageRepository>;
let warehouseRepository: jest.Mocked<IWarehouseRepository>;
let storeRoomRepository: jest.Mocked<IStoreRoomRepository>;
let customRoomRepository: jest.Mocked<ICustomRoomRepository>;
let eventBus: jest.Mocked<EventBus>;

beforeEach(() => {
  storageRepository = {
    findOrCreate: jest.fn(),
    existsActiveName: jest.fn(),
    findIdByTenantUUID: jest.fn().mockResolvedValue(42),
  };
  warehouseRepository = {
    count: jest.fn(),
    findByUUID: jest.fn(),
    save: jest.fn().mockImplementation(async (m) => m),
    deleteByUUID: jest.fn(),
  };
  storeRoomRepository = {
    count: jest.fn(),
    findByUUID: jest.fn(),
    save: jest.fn().mockImplementation(async (m) => m),
    deleteByUUID: jest.fn(),
  };
  customRoomRepository = {
    count: jest.fn(),
    findByUUID: jest.fn(),
    save: jest.fn().mockImplementation(async (m) => m),
    deleteByUUID: jest.fn(),
  };
  eventBus = { publish: jest.fn() } as unknown as jest.Mocked<EventBus>;
});

// ═══ FreezeXHandler ════════════════════════════════════════════════════════════

describe('FreezeWarehouseHandler', () => {
  let handler: FreezeWarehouseHandler;

  beforeEach(() => {
    handler = new FreezeWarehouseHandler(storageRepository, warehouseRepository, eventBus);
  });

  describe('Given an ACTIVE warehouse', () => {
    describe('When freeze is requested', () => {
      it('Then the model is frozen, saved, and StorageFrozenEvent is published', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());

        const result = await handler.execute(
          new FreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().frozenAt).toBeInstanceOf(Date);
        expect(eventBus.publish.mock.calls[0][0]).toBeInstanceOf(StorageFrozenEvent);
      });
    });
  });

  describe('Given a warehouse belonging to another tenant', () => {
    describe('When freeze is requested', () => {
      it('Then it returns StorageNotFoundError', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ tenantUUID: OTHER_TENANT_UUID }),
        );

        const result = await handler.execute(
          new FreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given a non-existent warehouse', () => {
    describe('When freeze is requested', () => {
      it('Then it returns StorageNotFoundError', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new FreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given a FROZEN warehouse', () => {
    describe('When freeze is requested again', () => {
      it('Then it returns StorageAlreadyFrozenError', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ frozenAt: new Date() }),
        );

        const result = await handler.execute(
          new FreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyFrozenError);
      });
    });
  });

  describe('Given an ARCHIVED warehouse', () => {
    describe('When freeze is requested', () => {
      it('Then it returns StorageArchivedCannotBeFrozenError (restore first)', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ archivedAt: new Date() }),
        );

        const result = await handler.execute(
          new FreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageArchivedCannotBeFrozenError);
      });
    });
  });

  describe('Given a missing parent storage id', () => {
    describe('When freeze is requested', () => {
      it('Then it returns StorageNotFoundError as a defensive guard', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());
        storageRepository.findIdByTenantUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new FreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });
});

describe('FreezeStoreRoomHandler', () => {
  let handler: FreezeStoreRoomHandler;

  beforeEach(() => {
    handler = new FreezeStoreRoomHandler(storageRepository, storeRoomRepository, eventBus);
  });

  describe('Given an ACTIVE store room', () => {
    describe('When freeze is requested', () => {
      it('Then it succeeds', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());

        const result = await handler.execute(
          new FreezeStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(eventBus.publish.mock.calls[0][0]).toBeInstanceOf(StorageFrozenEvent);
      });
    });
  });

  describe('Given an ARCHIVED store room', () => {
    describe('When freeze is requested', () => {
      it('Then it returns StorageArchivedCannotBeFrozenError', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(
          makeStoreRoom({ archivedAt: new Date() }),
        );

        const result = await handler.execute(
          new FreezeStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageArchivedCannotBeFrozenError);
      });
    });
  });
});

describe('FreezeCustomRoomHandler', () => {
  let handler: FreezeCustomRoomHandler;

  beforeEach(() => {
    handler = new FreezeCustomRoomHandler(storageRepository, customRoomRepository, eventBus);
  });

  describe('Given an ACTIVE custom room', () => {
    describe('When freeze is requested', () => {
      it('Then it succeeds', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom());

        const result = await handler.execute(
          new FreezeCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(eventBus.publish.mock.calls[0][0]).toBeInstanceOf(StorageFrozenEvent);
      });
    });
  });

  describe('Given an already FROZEN custom room', () => {
    describe('When freeze is requested', () => {
      it('Then it returns StorageAlreadyFrozenError', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(
          makeCustomRoom({ frozenAt: new Date() }),
        );

        const result = await handler.execute(
          new FreezeCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyFrozenError);
      });
    });
  });
});

// ═══ UnfreezeXHandler ══════════════════════════════════════════════════════════

describe('UnfreezeWarehouseHandler', () => {
  let handler: UnfreezeWarehouseHandler;

  beforeEach(() => {
    handler = new UnfreezeWarehouseHandler(storageRepository, warehouseRepository, eventBus);
  });

  describe('Given a FROZEN warehouse', () => {
    describe('When unfreeze is requested', () => {
      it('Then frozenAt is cleared and StorageReactivatedEvent is published', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ frozenAt: new Date() }),
        );

        const result = await handler.execute(
          new UnfreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().frozenAt).toBeNull();
        expect(eventBus.publish.mock.calls[0][0]).toBeInstanceOf(StorageReactivatedEvent);
      });
    });
  });

  describe('Given an ACTIVE warehouse', () => {
    describe('When unfreeze is requested', () => {
      it('Then it returns StorageNotFrozenError', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());

        const result = await handler.execute(
          new UnfreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFrozenError);
      });
    });
  });

  describe('Given a warehouse belonging to another tenant', () => {
    describe('When unfreeze is requested', () => {
      it('Then it returns StorageNotFoundError', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ frozenAt: new Date(), tenantUUID: OTHER_TENANT_UUID }),
        );

        const result = await handler.execute(
          new UnfreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given a missing parent storage id', () => {
    describe('When unfreeze is requested', () => {
      it('Then it returns StorageNotFoundError', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ frozenAt: new Date() }),
        );
        storageRepository.findIdByTenantUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new UnfreezeWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });
});

describe('UnfreezeStoreRoomHandler', () => {
  let handler: UnfreezeStoreRoomHandler;

  beforeEach(() => {
    handler = new UnfreezeStoreRoomHandler(storageRepository, storeRoomRepository, eventBus);
  });

  describe('Given a FROZEN store room', () => {
    describe('When unfreeze is requested', () => {
      it('Then it succeeds', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom({ frozenAt: new Date() }));

        const result = await handler.execute(
          new UnfreezeStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given an ACTIVE store room', () => {
    describe('When unfreeze is requested', () => {
      it('Then it returns StorageNotFrozenError', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());

        const result = await handler.execute(
          new UnfreezeStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFrozenError);
      });
    });
  });
});

describe('UnfreezeCustomRoomHandler', () => {
  let handler: UnfreezeCustomRoomHandler;

  beforeEach(() => {
    handler = new UnfreezeCustomRoomHandler(storageRepository, customRoomRepository, eventBus);
  });

  describe('Given a FROZEN custom room', () => {
    describe('When unfreeze is requested', () => {
      it('Then it succeeds', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(
          makeCustomRoom({ frozenAt: new Date() }),
        );

        const result = await handler.execute(
          new UnfreezeCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given an ACTIVE custom room', () => {
    describe('When unfreeze is requested', () => {
      it('Then it returns StorageNotFrozenError', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom());

        const result = await handler.execute(
          new UnfreezeCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFrozenError);
      });
    });
  });
});
