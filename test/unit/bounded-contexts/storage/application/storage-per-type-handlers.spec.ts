import { EventBus } from '@nestjs/cqrs';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
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
import { StorageUpdateEventsPublisher } from '@storage/application/services/storage-update-events.publisher';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StorageAlreadyArchivedError } from '@storage/domain/errors/storage-already-archived.error';
import { StorageNotArchivedError } from '@storage/domain/errors/storage-not-archived.error';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { StorageAddressRequiredForWarehouseError } from '@storage/domain/errors/storage-address-required-for-warehouse.error';
import { StorageArchivedEvent } from '@storage/domain/events/storage-archived.event';
import { StorageRestoredEvent } from '@storage/domain/events/storage-restored.event';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
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
  overrides: Partial<{
    archivedAt: Date | null;
    frozenAt: Date | null;
    tenantUUID: string;
    name: string;
  }> = {},
): WarehouseModel {
  return WarehouseModel.reconstitute({
    id: 1,
    uuid: new UUIDVO(WH_UUID),
    tenantUUID: overrides.tenantUUID ?? TENANT_UUID,
    name: new StorageNameVO(overrides.name ?? 'Main Warehouse'),
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
  overrides: Partial<{
    archivedAt: Date | null;
    frozenAt: Date | null;
    tenantUUID: string;
    name: string;
  }> = {},
): StoreRoomModel {
  return StoreRoomModel.reconstitute({
    id: 2,
    uuid: new UUIDVO(SR_UUID),
    tenantUUID: overrides.tenantUUID ?? TENANT_UUID,
    name: new StorageNameVO(overrides.name ?? 'Main Store Room'),
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
  overrides: Partial<{
    archivedAt: Date | null;
    frozenAt: Date | null;
    tenantUUID: string;
    name: string;
    roomType: string;
  }> = {},
): CustomRoomModel {
  return CustomRoomModel.reconstitute({
    id: 3,
    uuid: new UUIDVO(CR_UUID),
    tenantUUID: overrides.tenantUUID ?? TENANT_UUID,
    name: StorageNameVO.create(overrides.name ?? 'Break Room'),
    description: null,
    icon: StorageIconVO.create('coffee'),
    color: StorageColorVO.create('#6b7280'),
    roomType: RoomTypeNameVO.create(overrides.roomType ?? 'Office'),
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
let updatePublisher: jest.Mocked<StorageUpdateEventsPublisher>;

beforeEach(() => {
  storageRepository = {
    findOrCreate: jest.fn(),
    existsActiveName: jest.fn().mockResolvedValue(false),
    findIdByTenantUUID: jest.fn().mockResolvedValue(42),
  };
  warehouseRepository = {
    count: jest.fn(),
    findByUUID: jest.fn(),
    save: jest.fn(),
    deleteByUUID: jest.fn(),
  };
  storeRoomRepository = {
    count: jest.fn(),
    findByUUID: jest.fn(),
    save: jest.fn(),
    deleteByUUID: jest.fn(),
  };
  customRoomRepository = {
    count: jest.fn(),
    findByUUID: jest.fn(),
    save: jest.fn(),
    deleteByUUID: jest.fn(),
  };
  eventBus = { publish: jest.fn() } as unknown as jest.Mocked<EventBus>;
  updatePublisher = { publish: jest.fn() } as unknown as jest.Mocked<StorageUpdateEventsPublisher>;
});

// ═══ ArchiveXHandler ═══════════════════════════════════════════════════════════

describe('ArchiveWarehouseHandler', () => {
  let handler: ArchiveWarehouseHandler;

  beforeEach(() => {
    handler = new ArchiveWarehouseHandler(storageRepository, warehouseRepository, eventBus);
  });

  describe('Given an ACTIVE warehouse owned by the tenant', () => {
    describe('When archive is requested', () => {
      it('Then it saves the archived model and publishes StorageArchivedEvent', async () => {
        const warehouse = makeWarehouse();
        warehouseRepository.findByUUID.mockResolvedValue(warehouse);
        warehouseRepository.save.mockImplementation(async (model) => model);

        const result = await handler.execute(
          new ArchiveWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().type).toBe(StorageType.WAREHOUSE);
        expect(result._unsafeUnwrap().archivedAt).toBeInstanceOf(Date);
        expect(warehouseRepository.save).toHaveBeenCalledTimes(1);
        expect(eventBus.publish).toHaveBeenCalledTimes(1);
        expect(eventBus.publish.mock.calls[0][0]).toBeInstanceOf(StorageArchivedEvent);
      });
    });
  });

  describe('Given a FROZEN warehouse', () => {
    describe('When archive is requested', () => {
      it('Then archive still succeeds (transition allowed from FROZEN) and frozenAt is cleared', async () => {
        const warehouse = makeWarehouse({ frozenAt: new Date('2024-05-01') });
        warehouseRepository.findByUUID.mockResolvedValue(warehouse);
        warehouseRepository.save.mockImplementation(async (model) => model);

        const result = await handler.execute(
          new ArchiveWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().frozenAt).toBeNull();
      });
    });
  });

  describe('Given the warehouse does not exist', () => {
    describe('When archive is requested', () => {
      it('Then it returns StorageNotFoundError', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new ArchiveWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the warehouse belongs to another tenant', () => {
    describe('When archive is requested', () => {
      it('Then it returns StorageNotFoundError (no mismatch leak)', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ tenantUUID: OTHER_TENANT_UUID }),
        );

        const result = await handler.execute(
          new ArchiveWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the warehouse is already archived', () => {
    describe('When archive is requested again', () => {
      it('Then it returns StorageAlreadyArchivedError', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ archivedAt: new Date() }),
        );

        const result = await handler.execute(
          new ArchiveWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyArchivedError);
      });
    });
  });

  describe('Given the parent storage id cannot be found', () => {
    describe('When archive is requested', () => {
      it('Then it returns StorageNotFoundError as a defensive guard', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());
        storageRepository.findIdByTenantUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new ArchiveWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });
});

describe('ArchiveStoreRoomHandler', () => {
  let handler: ArchiveStoreRoomHandler;

  beforeEach(() => {
    handler = new ArchiveStoreRoomHandler(storageRepository, storeRoomRepository, eventBus);
  });

  describe('Given an ACTIVE store room', () => {
    describe('When archive is requested', () => {
      it('Then it saves and publishes StorageArchivedEvent', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
        storeRoomRepository.save.mockImplementation(async (m) => m);

        const result = await handler.execute(
          new ArchiveStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().type).toBe(StorageType.STORE_ROOM);
        expect(eventBus.publish.mock.calls[0][0]).toBeInstanceOf(StorageArchivedEvent);
      });
    });
  });

  describe('Given the store room belongs to another tenant', () => {
    describe('When archive is requested', () => {
      it('Then it returns StorageNotFoundError', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(
          makeStoreRoom({ tenantUUID: OTHER_TENANT_UUID }),
        );

        const result = await handler.execute(
          new ArchiveStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the store room is already archived', () => {
    describe('When archive is requested again', () => {
      it('Then it returns StorageAlreadyArchivedError', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(
          makeStoreRoom({ archivedAt: new Date() }),
        );

        const result = await handler.execute(
          new ArchiveStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyArchivedError);
      });
    });
  });
});

describe('ArchiveCustomRoomHandler', () => {
  let handler: ArchiveCustomRoomHandler;

  beforeEach(() => {
    handler = new ArchiveCustomRoomHandler(storageRepository, customRoomRepository, eventBus);
  });

  describe('Given an ACTIVE custom room', () => {
    describe('When archive is requested', () => {
      it('Then it saves and publishes StorageArchivedEvent', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom());
        customRoomRepository.save.mockImplementation(async (m) => m);

        const result = await handler.execute(
          new ArchiveCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().type).toBe(StorageType.CUSTOM_ROOM);
        expect(eventBus.publish.mock.calls[0][0]).toBeInstanceOf(StorageArchivedEvent);
      });
    });
  });

  describe('Given the custom room is already archived', () => {
    describe('When archive is requested again', () => {
      it('Then it returns StorageAlreadyArchivedError', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(
          makeCustomRoom({ archivedAt: new Date() }),
        );

        const result = await handler.execute(
          new ArchiveCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyArchivedError);
      });
    });
  });
});

// ═══ RestoreXHandler ═══════════════════════════════════════════════════════════

describe('RestoreWarehouseHandler', () => {
  let handler: RestoreWarehouseHandler;

  beforeEach(() => {
    handler = new RestoreWarehouseHandler(storageRepository, warehouseRepository, eventBus);
  });

  describe('Given an ARCHIVED warehouse', () => {
    describe('When restore is requested', () => {
      it('Then it clears archivedAt, saves, and publishes StorageRestoredEvent', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ archivedAt: new Date() }),
        );
        warehouseRepository.save.mockImplementation(async (m) => m);

        const result = await handler.execute(
          new RestoreWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().archivedAt).toBeNull();
        expect(eventBus.publish.mock.calls[0][0]).toBeInstanceOf(StorageRestoredEvent);
      });
    });
  });

  describe('Given an ACTIVE warehouse', () => {
    describe('When restore is requested', () => {
      it('Then it returns StorageNotArchivedError', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());

        const result = await handler.execute(
          new RestoreWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotArchivedError);
        expect(eventBus.publish).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the warehouse belongs to another tenant', () => {
    describe('When restore is requested', () => {
      it('Then it returns StorageNotFoundError', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ archivedAt: new Date(), tenantUUID: OTHER_TENANT_UUID }),
        );

        const result = await handler.execute(
          new RestoreWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the warehouse does not exist', () => {
    describe('When restore is requested', () => {
      it('Then it returns StorageNotFoundError', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new RestoreWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the parent storage id cannot be resolved', () => {
    describe('When restore is requested', () => {
      it('Then it returns StorageNotFoundError as a defensive guard', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ archivedAt: new Date() }),
        );
        storageRepository.findIdByTenantUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new RestoreWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the tenant is already at the warehouse tier limit', () => {
    describe('When restore is requested', () => {
      it('Then restore still succeeds — restore does NOT consume quota (EC-H07-1)', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ archivedAt: new Date() }),
        );
        warehouseRepository.save.mockImplementation(async (m) => m);

        const result = await handler.execute(
          new RestoreWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
      });
    });
  });
});

describe('RestoreStoreRoomHandler', () => {
  let handler: RestoreStoreRoomHandler;

  beforeEach(() => {
    handler = new RestoreStoreRoomHandler(storageRepository, storeRoomRepository, eventBus);
  });

  describe('Given an ARCHIVED store room', () => {
    describe('When restore is requested', () => {
      it('Then it succeeds and publishes StorageRestoredEvent', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(
          makeStoreRoom({ archivedAt: new Date() }),
        );
        storeRoomRepository.save.mockImplementation(async (m) => m);

        const result = await handler.execute(
          new RestoreStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(eventBus.publish.mock.calls[0][0]).toBeInstanceOf(StorageRestoredEvent);
      });
    });
  });

  describe('Given an ACTIVE store room', () => {
    describe('When restore is requested', () => {
      it('Then it returns StorageNotArchivedError', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());

        const result = await handler.execute(
          new RestoreStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotArchivedError);
      });
    });
  });
});

describe('RestoreCustomRoomHandler', () => {
  let handler: RestoreCustomRoomHandler;

  beforeEach(() => {
    handler = new RestoreCustomRoomHandler(storageRepository, customRoomRepository, eventBus);
  });

  describe('Given an ARCHIVED custom room', () => {
    describe('When restore is requested', () => {
      it('Then it succeeds and publishes StorageRestoredEvent', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(
          makeCustomRoom({ archivedAt: new Date() }),
        );
        customRoomRepository.save.mockImplementation(async (m) => m);

        const result = await handler.execute(
          new RestoreCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(eventBus.publish.mock.calls[0][0]).toBeInstanceOf(StorageRestoredEvent);
      });
    });
  });

  describe('Given an ACTIVE custom room', () => {
    describe('When restore is requested', () => {
      it('Then it returns StorageNotArchivedError', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom());

        const result = await handler.execute(
          new RestoreCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotArchivedError);
      });
    });
  });
});

// ═══ UpdateXHandler (per-type pattern post DT-H07-4) ═══════════════════════════

describe('UpdateWarehouseHandler', () => {
  let handler: UpdateWarehouseHandler;

  beforeEach(() => {
    handler = new UpdateWarehouseHandler(storageRepository, warehouseRepository, updatePublisher);
  });

  describe('Given an ACTIVE warehouse', () => {
    describe('When update is requested with a fresh name', () => {
      it('Then it returns the updated StorageItemView and publishes via the update publisher', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse({ name: 'Old' }));
        warehouseRepository.save.mockImplementation(async (m) => m);

        const result = await handler.execute(
          new UpdateWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, 'New'),
        );

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().name).toBe('New');
        expect(updatePublisher.publish).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given an ARCHIVED warehouse (H-07 E5.2 — metadata editable)', () => {
    describe('When update is requested', () => {
      it('Then the update succeeds (no isArchived gate)', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ archivedAt: new Date() }),
        );
        warehouseRepository.save.mockImplementation(async (m) => m);

        const result = await handler.execute(
          new UpdateWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, 'Edited While Archived'),
        );

        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given a name that collides with another active storage', () => {
    describe('When update is requested', () => {
      it('Then it returns StorageNameAlreadyExistsError', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse({ name: 'Old' }));
        storageRepository.existsActiveName.mockResolvedValue(true);

        const result = await handler.execute(
          new UpdateWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, 'Taken'),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
      });
    });
  });

  describe('Given an empty address', () => {
    describe('When update is requested', () => {
      it('Then it returns StorageAddressRequiredForWarehouseError', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());

        const result = await handler.execute(
          new UpdateWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, undefined, undefined, '  '),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
      });
    });
  });

  describe('Given the warehouse belongs to another tenant', () => {
    describe('When update is requested', () => {
      it('Then it returns StorageNotFoundError', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ tenantUUID: OTHER_TENANT_UUID }),
        );

        const result = await handler.execute(
          new UpdateWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, 'New'),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the parent storage id cannot be resolved', () => {
    describe('When update is requested', () => {
      it('Then it returns StorageNotFoundError as a defensive guard', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());
        storageRepository.findIdByTenantUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new UpdateWarehouseCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, 'New'),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });
});

describe('UpdateStoreRoomHandler', () => {
  let handler: UpdateStoreRoomHandler;

  beforeEach(() => {
    handler = new UpdateStoreRoomHandler(storageRepository, storeRoomRepository, updatePublisher);
  });

  describe('Given an ACTIVE store room', () => {
    describe('When update is requested with a fresh name', () => {
      it('Then it succeeds and publishes', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom({ name: 'Old' }));
        storeRoomRepository.save.mockImplementation(async (m) => m);

        const result = await handler.execute(
          new UpdateStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, 'Renamed'),
        );

        expect(result.isOk()).toBe(true);
        expect(updatePublisher.publish).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given a name collision', () => {
    describe('When update is requested', () => {
      it('Then it returns StorageNameAlreadyExistsError', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom({ name: 'Old' }));
        storageRoomExistsReturns(true);

        const result = await handler.execute(
          new UpdateStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, 'Taken'),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
      });
    });
  });

  describe('Given the store room does not exist', () => {
    describe('When update is requested', () => {
      it('Then it returns StorageNotFoundError', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new UpdateStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, 'X'),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the parent storage id cannot be resolved', () => {
    describe('When update is requested', () => {
      it('Then it returns StorageNotFoundError as a defensive guard', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom({ name: 'Old' }));
        storageRepository.findIdByTenantUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new UpdateStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, 'New'),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given the name in the command equals the current name', () => {
    describe('When update is requested', () => {
      it('Then the name-duplication check is skipped and the update succeeds', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom({ name: 'Same' }));

        const result = await handler.execute(
          new UpdateStoreRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, 'Same'),
        );

        expect(result.isOk()).toBe(true);
        expect(storageRepository.existsActiveName).not.toHaveBeenCalled();
      });
    });
  });
});

// helper for the nested test above — kept in scope of the file
function storageRoomExistsReturns(flag: boolean): void {
  storageRepository.existsActiveName.mockResolvedValue(flag);
}

describe('UpdateCustomRoomHandler', () => {
  let handler: UpdateCustomRoomHandler;

  beforeEach(() => {
    handler = new UpdateCustomRoomHandler(
      storageRepository,
      customRoomRepository,
      updatePublisher,
    );
  });

  describe('Given an ACTIVE custom room', () => {
    describe('When update is requested with a new roomType', () => {
      it('Then the update succeeds and the publisher sees roomType in fields', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(
          makeCustomRoom({ roomType: 'Office' }),
        );
        customRoomRepository.save.mockImplementation(async (m) => m);

        const result = await handler.execute(
          new UpdateCustomRoomCommand(
            CR_UUID,
            TENANT_UUID,
            ACTOR_UUID,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            'Kitchen',
          ),
        );

        expect(result.isOk()).toBe(true);
        const publishedArg = updatePublisher.publish.mock.calls[0][0];
        expect(publishedArg.fields.roomType).toBe('Kitchen');
      });
    });
  });

  describe('Given the custom room does not exist', () => {
    describe('When update is requested', () => {
      it('Then it returns StorageNotFoundError', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new UpdateCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, 'X'),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });

  describe('Given a name collision for a custom room', () => {
    describe('When update is requested', () => {
      it('Then it returns StorageNameAlreadyExistsError', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom({ name: 'Old' }));
        storageRepository.existsActiveName.mockResolvedValue(true);

        const result = await handler.execute(
          new UpdateCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, 'Taken'),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
      });
    });
  });

  describe('Given the parent storage id cannot be resolved for a custom room', () => {
    describe('When update is requested', () => {
      it('Then it returns StorageNotFoundError as a defensive guard', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom());
        storageRepository.findIdByTenantUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new UpdateCustomRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, 'New'),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });
});
