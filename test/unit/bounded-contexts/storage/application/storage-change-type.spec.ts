import { EventBus } from '@nestjs/cqrs';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
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
import { StorageTypeChangePolicy } from '@storage/application/services/storage-type-change.policy';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { IStorageRepository } from '@storage/domain/contracts/storage.repository.contract';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StorageNotFoundError } from '@storage/domain/errors/storage-not-found.error';
import { StorageTypeLockedWhileArchivedError } from '@storage/domain/errors/storage-type-locked-while-archived.error';
import { StorageTypeLockedWhileFrozenError } from '@storage/domain/errors/storage-type-locked-while-frozen.error';
import { StorageAddressRequiredForWarehouseError } from '@storage/domain/errors/storage-address-required-for-warehouse.error';
import { CustomRoomLimitReachedError } from '@storage/application/errors/custom-room-limit-reached.error';
import { StoreRoomLimitReachedError } from '@storage/application/errors/store-room-limit-reached.error';
import { WarehouseRequiresTierUpgradeError } from '@storage/application/errors/warehouse-requires-tier-upgrade.error';
import { StorageTypeChangedEvent } from '@storage/domain/events/storage-type-changed.event';
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
  overrides: Partial<{
    archivedAt: Date | null;
    frozenAt: Date | null;
    tenantUUID: string;
    address: string;
  }> = {},
): WarehouseModel {
  return WarehouseModel.reconstitute({
    id: 1,
    uuid: new UUIDVO(WH_UUID),
    tenantUUID: overrides.tenantUUID ?? TENANT_UUID,
    name: new StorageNameVO('WH'),
    description: null,
    icon: new StorageIconVO('warehouse'),
    color: new StorageColorVO('#3b82f6'),
    address: new StorageAddressVO(overrides.address ?? '789 Industrial'),
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
    address: string;
  }> = {},
): StoreRoomModel {
  return StoreRoomModel.reconstitute({
    id: 2,
    uuid: new UUIDVO(SR_UUID),
    tenantUUID: overrides.tenantUUID ?? TENANT_UUID,
    name: new StorageNameVO('SR'),
    description: null,
    icon: new StorageIconVO('inventory_2'),
    color: new StorageColorVO('#d97706'),
    address: new StorageAddressVO(overrides.address ?? '456 Oak'),
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
    address: string;
  }> = {},
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
    address: StorageAddressVO.create(overrides.address ?? '123 Main'),
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
let policy: jest.Mocked<StorageTypeChangePolicy>;

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
    deleteByUUID: jest.fn().mockResolvedValue(undefined),
  };
  storeRoomRepository = {
    count: jest.fn(),
    findByUUID: jest.fn(),
    save: jest.fn().mockImplementation(async (m) => m),
    deleteByUUID: jest.fn().mockResolvedValue(undefined),
  };
  customRoomRepository = {
    count: jest.fn(),
    findByUUID: jest.fn(),
    save: jest.fn().mockImplementation(async (m) => m),
    deleteByUUID: jest.fn().mockResolvedValue(undefined),
  };
  eventBus = { publish: jest.fn() } as unknown as jest.Mocked<EventBus>;
  policy = {
    assertWarehouseCapacity: jest.fn().mockResolvedValue(null),
    assertStoreRoomCapacity: jest.fn().mockResolvedValue(null),
    assertCustomRoomCapacity: jest.fn().mockResolvedValue(null),
    assertAddressForWarehouse: jest.fn().mockReturnValue(null),
  } as unknown as jest.Mocked<StorageTypeChangePolicy>;
});

// ═══ Warehouse → StoreRoom ═════════════════════════════════════════════════════

describe('ChangeWarehouseToStoreRoomHandler', () => {
  let handler: ChangeWarehouseToStoreRoomHandler;

  beforeEach(() => {
    handler = new ChangeWarehouseToStoreRoomHandler(
      storageRepository,
      warehouseRepository,
      storeRoomRepository,
      policy,
      eventBus,
    );
  });

  describe('Given an ACTIVE warehouse', () => {
    describe('When conversion to store-room is requested', () => {
      it('Then source is deleted, target is saved, and StorageTypeChangedEvent publishes', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());

        const result = await handler.execute(
          new ChangeWarehouseToStoreRoomCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(warehouseRepository.deleteByUUID).toHaveBeenCalledWith(WH_UUID);
        expect(storeRoomRepository.save).toHaveBeenCalledTimes(1);
        expect(eventBus.publish.mock.calls[0][0]).toBeInstanceOf(StorageTypeChangedEvent);
      });
    });
  });

  describe('Given an ARCHIVED source warehouse', () => {
    describe('When conversion is requested', () => {
      it('Then StorageTypeLockedWhileArchivedError is returned', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ archivedAt: new Date() }),
        );

        const result = await handler.execute(
          new ChangeWarehouseToStoreRoomCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileArchivedError);
      });
    });
  });

  describe('Given a FROZEN source warehouse', () => {
    describe('When conversion is requested', () => {
      it('Then StorageTypeLockedWhileFrozenError is returned', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(
          makeWarehouse({ frozenAt: new Date() }),
        );

        const result = await handler.execute(
          new ChangeWarehouseToStoreRoomCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileFrozenError);
      });
    });
  });

  describe('Given the tenant has reached the store-room limit', () => {
    describe('When conversion is requested', () => {
      it('Then StoreRoomLimitReachedError is returned', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());
        policy.assertStoreRoomCapacity.mockResolvedValue(new StoreRoomLimitReachedError());

        const result = await handler.execute(
          new ChangeWarehouseToStoreRoomCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StoreRoomLimitReachedError);
      });
    });
  });

  describe('Given a non-existent source warehouse', () => {
    describe('When conversion is requested', () => {
      it('Then StorageNotFoundError is returned', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(null);

        const result = await handler.execute(
          new ChangeWarehouseToStoreRoomCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });
});

// ═══ Warehouse → CustomRoom ═══════════════════════════════════════════════════

describe('ChangeWarehouseToCustomRoomHandler', () => {
  let handler: ChangeWarehouseToCustomRoomHandler;

  beforeEach(() => {
    handler = new ChangeWarehouseToCustomRoomHandler(
      storageRepository,
      warehouseRepository,
      customRoomRepository,
      policy,
      eventBus,
    );
  });

  describe('Given an ACTIVE warehouse', () => {
    describe('When conversion to custom-room is requested', () => {
      it('Then source is deleted, target is saved, event fires', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());

        const result = await handler.execute(
          new ChangeWarehouseToCustomRoomCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
        expect(warehouseRepository.deleteByUUID).toHaveBeenCalled();
        expect(customRoomRepository.save).toHaveBeenCalled();
      });
    });
  });

  describe('Given the tenant has reached the custom-room limit', () => {
    describe('When conversion is requested', () => {
      it('Then CustomRoomLimitReachedError is returned', async () => {
        warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());
        policy.assertCustomRoomCapacity.mockResolvedValue(new CustomRoomLimitReachedError());

        const result = await handler.execute(
          new ChangeWarehouseToCustomRoomCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(CustomRoomLimitReachedError);
      });
    });
  });
});

// ═══ StoreRoom → Warehouse ════════════════════════════════════════════════════

describe('ChangeStoreRoomToWarehouseHandler', () => {
  let handler: ChangeStoreRoomToWarehouseHandler;

  beforeEach(() => {
    handler = new ChangeStoreRoomToWarehouseHandler(
      storageRepository,
      storeRoomRepository,
      warehouseRepository,
      policy,
      eventBus,
    );
  });

  describe('Given an ACTIVE store room with an address', () => {
    describe('When conversion to warehouse is requested', () => {
      it('Then it succeeds', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());

        const result = await handler.execute(
          new ChangeStoreRoomToWarehouseCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given the tenant tier does not allow warehouses', () => {
    describe('When conversion is requested', () => {
      it('Then WarehouseRequiresTierUpgradeError is returned', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
        policy.assertWarehouseCapacity.mockResolvedValue(new WarehouseRequiresTierUpgradeError());

        const result = await handler.execute(
          new ChangeStoreRoomToWarehouseCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
      });
    });
  });

  describe('Given the store room has no address', () => {
    describe('When conversion to warehouse is requested', () => {
      it('Then StorageAddressRequiredForWarehouseError is returned', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
        policy.assertAddressForWarehouse.mockReturnValue(
          new StorageAddressRequiredForWarehouseError(SR_UUID),
        );

        const result = await handler.execute(
          new ChangeStoreRoomToWarehouseCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
      });
    });
  });
});

// ═══ StoreRoom → CustomRoom ═══════════════════════════════════════════════════

describe('ChangeStoreRoomToCustomRoomHandler', () => {
  let handler: ChangeStoreRoomToCustomRoomHandler;

  beforeEach(() => {
    handler = new ChangeStoreRoomToCustomRoomHandler(
      storageRepository,
      storeRoomRepository,
      customRoomRepository,
      policy,
      eventBus,
    );
  });

  describe('Given an ACTIVE store room', () => {
    describe('When conversion to custom-room is requested', () => {
      it('Then it succeeds', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());

        const result = await handler.execute(
          new ChangeStoreRoomToCustomRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given the store room belongs to another tenant', () => {
    describe('When conversion is requested', () => {
      it('Then StorageNotFoundError is returned', async () => {
        storeRoomRepository.findByUUID.mockResolvedValue(
          makeStoreRoom({ tenantUUID: OTHER_TENANT_UUID }),
        );

        const result = await handler.execute(
          new ChangeStoreRoomToCustomRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
      });
    });
  });
});

// ═══ CustomRoom → Warehouse ═══════════════════════════════════════════════════

describe('ChangeCustomRoomToWarehouseHandler', () => {
  let handler: ChangeCustomRoomToWarehouseHandler;

  beforeEach(() => {
    handler = new ChangeCustomRoomToWarehouseHandler(
      storageRepository,
      customRoomRepository,
      warehouseRepository,
      policy,
      eventBus,
    );
  });

  describe('Given an ACTIVE custom room with an address', () => {
    describe('When conversion to warehouse is requested', () => {
      it('Then it succeeds', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom());

        const result = await handler.execute(
          new ChangeCustomRoomToWarehouseCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given the custom room is archived', () => {
    describe('When conversion is requested', () => {
      it('Then StorageTypeLockedWhileArchivedError is returned', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(
          makeCustomRoom({ archivedAt: new Date() }),
        );

        const result = await handler.execute(
          new ChangeCustomRoomToWarehouseCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileArchivedError);
      });
    });
  });
});

// ═══ CustomRoom → StoreRoom ═══════════════════════════════════════════════════

describe('ChangeCustomRoomToStoreRoomHandler', () => {
  let handler: ChangeCustomRoomToStoreRoomHandler;

  beforeEach(() => {
    handler = new ChangeCustomRoomToStoreRoomHandler(
      storageRepository,
      customRoomRepository,
      storeRoomRepository,
      policy,
      eventBus,
    );
  });

  describe('Given an ACTIVE custom room', () => {
    describe('When conversion to store-room is requested', () => {
      it('Then it succeeds', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom());

        const result = await handler.execute(
          new ChangeCustomRoomToStoreRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Given the custom room is frozen', () => {
    describe('When conversion is requested', () => {
      it('Then StorageTypeLockedWhileFrozenError is returned', async () => {
        customRoomRepository.findByUUID.mockResolvedValue(
          makeCustomRoom({ frozenAt: new Date() }),
        );

        const result = await handler.execute(
          new ChangeCustomRoomToStoreRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
        );

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageTypeLockedWhileFrozenError);
      });
    });
  });
});
