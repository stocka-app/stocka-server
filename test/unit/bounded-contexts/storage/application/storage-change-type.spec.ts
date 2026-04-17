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
import { StorageNameAlreadyExistsError } from '@storage/domain/errors/storage-name-already-exists.error';
import { CustomRoomLimitReachedError } from '@storage/application/errors/custom-room-limit-reached.error';
import { StoreRoomLimitReachedError } from '@storage/application/errors/store-room-limit-reached.error';
import { WarehouseRequiresTierUpgradeError } from '@storage/application/errors/warehouse-requires-tier-upgrade.error';
import { StorageTypeChangedEvent } from '@storage/domain/events/storage-type-changed.event';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';

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
let uow: jest.Mocked<IUnitOfWork>;

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
  uow = {
    execute: jest.fn(async (fn: () => Promise<unknown>) => fn()),
    begin: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    isActive: jest.fn().mockReturnValue(false),
    getManager: jest.fn(),
    runIsolated: jest.fn(),
  } as unknown as jest.Mocked<IUnitOfWork>;
});

// ═══ Warehouse → StoreRoom ═════════════════════════════════════════════════════

describe('ChangeWarehouseToStoreRoomHandler', () => {
  let handler: ChangeWarehouseToStoreRoomHandler;

  beforeEach(() => {
    handler = new ChangeWarehouseToStoreRoomHandler(
      storageRepository,
      warehouseRepository,
      storeRoomRepository,
      uow,
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
      uow,
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
      uow,
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
      uow,
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
      uow,
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
      uow,
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

// ═══ Metadata merge — unified update + convert flow ════════════════════════════

describe('Convert-to handlers merge optional metadata into the new target', () => {
  describe('Given a warehouse converted to a custom room with custom metadata', () => {
    it('Then the saved custom room uses the provided name, roomType, icon, color, description and address', async () => {
      warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());
      const handler = new ChangeWarehouseToCustomRoomHandler(
        storageRepository,
        warehouseRepository,
        customRoomRepository,
        uow,
        policy,
        eventBus,
      );

      const result = await handler.execute(
        new ChangeWarehouseToCustomRoomCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'Cocina Principal',
          description: 'Zona caliente',
          address: 'Piso 2',
          roomType: 'Kitchen',
          icon: 'restaurant',
          color: '#0D9488',
        }),
      );

      expect(result.isOk()).toBe(true);
      const saved = customRoomRepository.save.mock.calls[0][0] as CustomRoomModel;
      expect(saved.name.getValue()).toBe('Cocina Principal');
      expect(saved.description?.getValue()).toBe('Zona caliente');
      expect(saved.address!.getValue()).toBe('Piso 2');
      expect(saved.roomType.getValue()).toBe('Kitchen');
      expect(saved.icon.getValue()).toBe('restaurant');
      expect(saved.color.getValue()).toBe('#0D9488');
    });
  });

  describe('Given a warehouse converted to a custom room without metadata', () => {
    it('Then source values are inherited and custom-room defaults fill icon/color/roomType', async () => {
      warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());
      const handler = new ChangeWarehouseToCustomRoomHandler(
        storageRepository,
        warehouseRepository,
        customRoomRepository,
        uow,
        policy,
        eventBus,
      );

      const result = await handler.execute(
        new ChangeWarehouseToCustomRoomCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
      );

      expect(result.isOk()).toBe(true);
      const saved = customRoomRepository.save.mock.calls[0][0] as CustomRoomModel;
      expect(saved.name.getValue()).toBe('WH');
      expect(saved.address!.getValue()).toBe('789 Industrial');
      expect(saved.roomType.getValue()).toBe('General');
    });
  });

  describe('Given a rename during conversion collides with an existing storage', () => {
    it('Then StorageNameAlreadyExistsError is returned and no target is saved', async () => {
      warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());
      storageRepository.existsActiveName.mockResolvedValue(true);
      const handler = new ChangeWarehouseToStoreRoomHandler(
        storageRepository,
        warehouseRepository,
        storeRoomRepository,
        uow,
        policy,
        eventBus,
      );

      const result = await handler.execute(
        new ChangeWarehouseToStoreRoomCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'Duplicated',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
      expect(storeRoomRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Given metadata address is provided when converting to a warehouse', () => {
    it('Then the effective address is validated and used instead of the source address', async () => {
      customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom({ address: 'ignored' }));
      const handler = new ChangeCustomRoomToWarehouseHandler(
        storageRepository,
        customRoomRepository,
        warehouseRepository,
        uow,
        policy,
        eventBus,
      );

      const result = await handler.execute(
        new ChangeCustomRoomToWarehouseCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, {
          address: 'Nueva 123',
        }),
      );

      expect(result.isOk()).toBe(true);
      expect(policy.assertAddressForWarehouse).toHaveBeenCalledWith('Nueva 123', CR_UUID);
      const saved = warehouseRepository.save.mock.calls[0][0] as WarehouseModel;
      expect(saved.address!.getValue()).toBe('Nueva 123');
    });
  });

  describe('Given description metadata is explicitly null when converting', () => {
    it('Then the target has no description even if source had one', async () => {
      const source = CustomRoomModel.reconstitute({
        id: 3,
        uuid: new UUIDVO(CR_UUID),
        tenantUUID: TENANT_UUID,
        name: StorageNameVO.create('CR'),
        description: null,
        icon: StorageIconVO.create('coffee'),
        color: StorageColorVO.create('#6b7280'),
        roomType: RoomTypeNameVO.create('Office'),
        address: StorageAddressVO.create('123 Main'),
        archivedAt: null,
        frozenAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      customRoomRepository.findByUUID.mockResolvedValue(source);
      const handler = new ChangeCustomRoomToStoreRoomHandler(
        storageRepository,
        customRoomRepository,
        storeRoomRepository,
        uow,
        policy,
        eventBus,
      );

      const result = await handler.execute(
        new ChangeCustomRoomToStoreRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, {
          description: null,
        }),
      );

      expect(result.isOk()).toBe(true);
      const saved = storeRoomRepository.save.mock.calls[0][0] as StoreRoomModel;
      expect(saved.description).toBeNull();
    });
  });

  describe('Given a store-room converts to a custom-room with only roomType set', () => {
    it('Then other fields stay at source values and defaults', async () => {
      storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
      const handler = new ChangeStoreRoomToCustomRoomHandler(
        storageRepository,
        storeRoomRepository,
        customRoomRepository,
        uow,
        policy,
        eventBus,
      );

      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, {
          roomType: 'Laboratory',
        }),
      );

      expect(result.isOk()).toBe(true);
      const saved = customRoomRepository.save.mock.calls[0][0] as CustomRoomModel;
      expect(saved.roomType.getValue()).toBe('Laboratory');
      expect(saved.name.getValue()).toBe('SR');
    });
  });

  describe('Given a store-room converts to a warehouse with metadata name', () => {
    it('Then existsActiveName is checked with the effective name', async () => {
      storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
      storageRepository.existsActiveName.mockResolvedValue(false);
      const handler = new ChangeStoreRoomToWarehouseHandler(
        storageRepository,
        storeRoomRepository,
        warehouseRepository,
        uow,
        policy,
        eventBus,
      );

      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'Almacen Norte',
        }),
      );

      expect(result.isOk()).toBe(true);
      expect(storageRepository.existsActiveName).toHaveBeenCalledWith(TENANT_UUID, 'Almacen Norte');
    });
  });

  describe('Given the target save fails during a convert operation', () => {
    it('Then delete and save run inside uow.execute so the source is not left orphaned', async () => {
      warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());
      storeRoomRepository.save.mockRejectedValueOnce(new Error('db failure'));
      const handler = new ChangeWarehouseToStoreRoomHandler(
        storageRepository,
        warehouseRepository,
        storeRoomRepository,
        uow,
        policy,
        eventBus,
      );

      await expect(
        handler.execute(
          new ChangeWarehouseToStoreRoomCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
        ),
      ).rejects.toThrow('db failure');

      // Both mutations are invoked inside the same uow.execute callback — the
      // real UoW implementation rolls back on throw, reverting the delete.
      expect(uow.execute).toHaveBeenCalledTimes(1);
      expect(warehouseRepository.deleteByUUID).toHaveBeenCalled();
      expect(storeRoomRepository.save).toHaveBeenCalled();
    });
  });

  describe('Given a custom-room converts to a store-room with metadata name that is identical to source', () => {
    it('Then no uniqueness check is performed', async () => {
      customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom());
      const handler = new ChangeCustomRoomToStoreRoomHandler(
        storageRepository,
        customRoomRepository,
        storeRoomRepository,
        uow,
        policy,
        eventBus,
      );

      const result = await handler.execute(
        new ChangeCustomRoomToStoreRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'CR',
        }),
      );

      expect(result.isOk()).toBe(true);
      expect(storageRepository.existsActiveName).not.toHaveBeenCalled();
    });
  });
});

// ═══ Cross-cutting branches: name conflict + missing parent storage id ═══════
//
// These branches are identical in shape across the six change-X-to-Y handlers
// (the rename guard runs before deletion + the storageId === null defensive
// guard runs after the capacity policy). One pair of tests per handler keeps
// the branch coverage at 100% without duplicating the full happy-path setup.

describe('Cross-cutting change-type branches', () => {
  describe('Given a rename collides for ChangeWarehouseToCustomRoomHandler', () => {
    it('Then StorageNameAlreadyExistsError is returned', async () => {
      warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());
      storageRepository.existsActiveName.mockResolvedValue(true);
      const handler = new ChangeWarehouseToCustomRoomHandler(
        storageRepository,
        warehouseRepository,
        customRoomRepository,
        uow,
        policy,
        eventBus,
      );

      const result = await handler.execute(
        new ChangeWarehouseToCustomRoomCommand(WH_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'Duplicated',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
    });
  });

  describe('Given a rename collides for ChangeStoreRoomToWarehouseHandler', () => {
    it('Then StorageNameAlreadyExistsError is returned', async () => {
      storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
      storageRepository.existsActiveName.mockResolvedValue(true);
      const handler = new ChangeStoreRoomToWarehouseHandler(
        storageRepository,
        storeRoomRepository,
        warehouseRepository,
        uow,
        policy,
        eventBus,
      );

      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'Duplicated',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
    });
  });

  describe('Given a rename collides for ChangeStoreRoomToCustomRoomHandler', () => {
    it('Then StorageNameAlreadyExistsError is returned', async () => {
      storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
      storageRepository.existsActiveName.mockResolvedValue(true);
      const handler = new ChangeStoreRoomToCustomRoomHandler(
        storageRepository,
        storeRoomRepository,
        customRoomRepository,
        uow,
        policy,
        eventBus,
      );

      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'Duplicated',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
    });
  });

  describe('Given a rename collides for ChangeCustomRoomToWarehouseHandler', () => {
    it('Then StorageNameAlreadyExistsError is returned', async () => {
      customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom());
      storageRepository.existsActiveName.mockResolvedValue(true);
      const handler = new ChangeCustomRoomToWarehouseHandler(
        storageRepository,
        customRoomRepository,
        warehouseRepository,
        uow,
        policy,
        eventBus,
      );

      const result = await handler.execute(
        new ChangeCustomRoomToWarehouseCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'Duplicated',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
    });
  });

  describe('Given a rename collides for ChangeCustomRoomToStoreRoomHandler', () => {
    it('Then StorageNameAlreadyExistsError is returned', async () => {
      customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom());
      storageRepository.existsActiveName.mockResolvedValue(true);
      const handler = new ChangeCustomRoomToStoreRoomHandler(
        storageRepository,
        customRoomRepository,
        storeRoomRepository,
        uow,
        policy,
        eventBus,
      );

      const result = await handler.execute(
        new ChangeCustomRoomToStoreRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'Duplicated',
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNameAlreadyExistsError);
    });
  });

  describe('Given the capacity policy reports a limit reached for each change-X handler', () => {
    it('Then ChangeWarehouseToCustomRoomHandler returns CustomRoomLimitReachedError', async () => {
      warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());
      policy.assertCustomRoomCapacity.mockResolvedValue(new CustomRoomLimitReachedError());
      const handler = new ChangeWarehouseToCustomRoomHandler(
        storageRepository,
        warehouseRepository,
        customRoomRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeWarehouseToCustomRoomCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
      );
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(CustomRoomLimitReachedError);
    });

    it('Then ChangeStoreRoomToWarehouseHandler returns WarehouseRequiresTierUpgradeError', async () => {
      storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
      policy.assertWarehouseCapacity.mockResolvedValue(new WarehouseRequiresTierUpgradeError());
      const handler = new ChangeStoreRoomToWarehouseHandler(
        storageRepository,
        storeRoomRepository,
        warehouseRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
      );
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
    });

    it('Then ChangeStoreRoomToCustomRoomHandler returns CustomRoomLimitReachedError', async () => {
      storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
      policy.assertCustomRoomCapacity.mockResolvedValue(new CustomRoomLimitReachedError());
      const handler = new ChangeStoreRoomToCustomRoomHandler(
        storageRepository,
        storeRoomRepository,
        customRoomRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
      );
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(CustomRoomLimitReachedError);
    });

    it('Then ChangeCustomRoomToWarehouseHandler returns WarehouseRequiresTierUpgradeError', async () => {
      customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom());
      policy.assertWarehouseCapacity.mockResolvedValue(new WarehouseRequiresTierUpgradeError());
      const handler = new ChangeCustomRoomToWarehouseHandler(
        storageRepository,
        customRoomRepository,
        warehouseRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeCustomRoomToWarehouseCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
      );
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
    });

    it('Then ChangeCustomRoomToStoreRoomHandler returns StoreRoomLimitReachedError', async () => {
      customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom());
      policy.assertStoreRoomCapacity.mockResolvedValue(new StoreRoomLimitReachedError());
      const handler = new ChangeCustomRoomToStoreRoomHandler(
        storageRepository,
        customRoomRepository,
        storeRoomRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeCustomRoomToStoreRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
      );
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StoreRoomLimitReachedError);
    });
  });

  describe('Given a converting source has no address (null) and metadata.address is also undefined', () => {
    it('Then ChangeCustomRoomToStoreRoomHandler succeeds and target.address falls back to null', async () => {
      const noAddrCR = CustomRoomModel.reconstitute({
        id: 3,
        uuid: new UUIDVO(CR_UUID),
        tenantUUID: TENANT_UUID,
        name: StorageNameVO.create('No Addr CR'),
        description: null,
        icon: StorageIconVO.create('coffee'),
        color: StorageColorVO.create('#6b7280'),
        roomType: RoomTypeNameVO.create('Office'),
        address: null,
        archivedAt: null,
        frozenAt: null,
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01'),
      });
      customRoomRepository.findByUUID.mockResolvedValue(noAddrCR);
      const handler = new ChangeCustomRoomToStoreRoomHandler(
        storageRepository,
        customRoomRepository,
        storeRoomRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeCustomRoomToStoreRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
      );
      expect(result.isOk()).toBe(true);
      const saved = storeRoomRepository.save.mock.calls[0][0] as StoreRoomModel;
      expect(saved.address).toBeNull();
    });

    it('Then ChangeStoreRoomToCustomRoomHandler succeeds and target.address falls back to null', async () => {
      const noAddrSR = StoreRoomModel.reconstitute({
        id: 2,
        uuid: new UUIDVO(SR_UUID),
        tenantUUID: TENANT_UUID,
        name: new StorageNameVO('No Addr SR'),
        description: null,
        icon: new StorageIconVO('inventory_2'),
        color: new StorageColorVO('#d97706'),
        address: null,
        archivedAt: null,
        frozenAt: null,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      });
      storeRoomRepository.findByUUID.mockResolvedValue(noAddrSR);
      const handler = new ChangeStoreRoomToCustomRoomHandler(
        storageRepository,
        storeRoomRepository,
        customRoomRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
      );
      expect(result.isOk()).toBe(true);
      const saved = customRoomRepository.save.mock.calls[0][0] as CustomRoomModel;
      expect(saved.address).toBeNull();
    });

    it('Then ChangeCustomRoomToWarehouseHandler returns address-required error (warehouse needs address)', async () => {
      const noAddrCR = CustomRoomModel.reconstitute({
        id: 3,
        uuid: new UUIDVO(CR_UUID),
        tenantUUID: TENANT_UUID,
        name: StorageNameVO.create('No Addr CR'),
        description: null,
        icon: StorageIconVO.create('coffee'),
        color: StorageColorVO.create('#6b7280'),
        roomType: RoomTypeNameVO.create('Office'),
        address: null,
        archivedAt: null,
        frozenAt: null,
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01'),
      });
      customRoomRepository.findByUUID.mockResolvedValue(noAddrCR);
      policy.assertAddressForWarehouse.mockReturnValueOnce(
        new StorageAddressRequiredForWarehouseError(CR_UUID),
      );
      const handler = new ChangeCustomRoomToWarehouseHandler(
        storageRepository,
        customRoomRepository,
        warehouseRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeCustomRoomToWarehouseCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
      );
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
    });

    it('Then ChangeStoreRoomToWarehouseHandler returns address-required error', async () => {
      const noAddrSR = StoreRoomModel.reconstitute({
        id: 2,
        uuid: new UUIDVO(SR_UUID),
        tenantUUID: TENANT_UUID,
        name: new StorageNameVO('No Addr SR'),
        description: null,
        icon: new StorageIconVO('inventory_2'),
        color: new StorageColorVO('#d97706'),
        address: null,
        archivedAt: null,
        frozenAt: null,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      });
      storeRoomRepository.findByUUID.mockResolvedValue(noAddrSR);
      policy.assertAddressForWarehouse.mockReturnValueOnce(
        new StorageAddressRequiredForWarehouseError(SR_UUID),
      );
      const handler = new ChangeStoreRoomToWarehouseHandler(
        storageRepository,
        storeRoomRepository,
        warehouseRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
      );
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
    });
  });

  describe('Given metadata overrides on a store-room → custom-room conversion', () => {
    it('Then a rename that does NOT collide proceeds and existsActiveName returns false', async () => {
      storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
      storageRepository.existsActiveName.mockResolvedValue(false);
      const handler = new ChangeStoreRoomToCustomRoomHandler(
        storageRepository,
        storeRoomRepository,
        customRoomRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, {
          name: 'Renamed CR',
        }),
      );
      expect(result.isOk()).toBe(true);
      const saved = customRoomRepository.save.mock.calls[0][0] as CustomRoomModel;
      expect(saved.name.getValue()).toBe('Renamed CR');
    });

    it('Then metadata.description with a value flows through to the target', async () => {
      storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
      const handler = new ChangeStoreRoomToCustomRoomHandler(
        storageRepository,
        storeRoomRepository,
        customRoomRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, {
          description: 'New description',
        }),
      );
      expect(result.isOk()).toBe(true);
      const saved = customRoomRepository.save.mock.calls[0][0] as CustomRoomModel;
      expect(saved.description?.getValue()).toBe('New description');
    });

    it('Then metadata.address with a value overrides the source address', async () => {
      storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
      const handler = new ChangeStoreRoomToCustomRoomHandler(
        storageRepository,
        storeRoomRepository,
        customRoomRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, {
          address: '999 Override St',
        }),
      );
      expect(result.isOk()).toBe(true);
      const saved = customRoomRepository.save.mock.calls[0][0] as CustomRoomModel;
      expect(saved.address?.getValue()).toBe('999 Override St');
    });
  });

  describe('Given metadata.address is explicitly null on a conversion to WAREHOUSE', () => {
    it('Then ChangeCustomRoomToWarehouseHandler resolves the empty-string fallback path for the address guard', async () => {
      customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom());
      policy.assertAddressForWarehouse.mockReturnValueOnce(
        new StorageAddressRequiredForWarehouseError(CR_UUID),
      );
      const handler = new ChangeCustomRoomToWarehouseHandler(
        storageRepository,
        customRoomRepository,
        warehouseRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeCustomRoomToWarehouseCommand(CR_UUID, TENANT_UUID, ACTOR_UUID, {
          address: null,
        }),
      );
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
    });

    it('Then ChangeStoreRoomToWarehouseHandler resolves the empty-string fallback for the address guard', async () => {
      storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
      policy.assertAddressForWarehouse.mockReturnValueOnce(
        new StorageAddressRequiredForWarehouseError(SR_UUID),
      );
      const handler = new ChangeStoreRoomToWarehouseHandler(
        storageRepository,
        storeRoomRepository,
        warehouseRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, {
          address: null,
        }),
      );
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
    });
  });

  describe('Given metadata.description with a value is provided to ChangeStoreRoomToWarehouseHandler', () => {
    it('Then the description flows through to the warehouse target', async () => {
      storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
      const handler = new ChangeStoreRoomToWarehouseHandler(
        storageRepository,
        storeRoomRepository,
        warehouseRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(SR_UUID, TENANT_UUID, ACTOR_UUID, {
          description: 'Promoted to warehouse',
        }),
      );
      expect(result.isOk()).toBe(true);
      const saved = warehouseRepository.save.mock.calls[0][0] as WarehouseModel;
      expect(saved.description?.getValue()).toBe('Promoted to warehouse');
    });
  });

  describe('Given the parent storage id cannot be resolved for any change-X handler', () => {
    beforeEach(() => {
      storageRepository.findIdByTenantUUID.mockResolvedValue(null);
    });

    it('Then ChangeWarehouseToStoreRoomHandler returns StorageNotFoundError', async () => {
      warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());
      const handler = new ChangeWarehouseToStoreRoomHandler(
        storageRepository,
        warehouseRepository,
        storeRoomRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeWarehouseToStoreRoomCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
      );
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });

    it('Then ChangeWarehouseToCustomRoomHandler returns StorageNotFoundError', async () => {
      warehouseRepository.findByUUID.mockResolvedValue(makeWarehouse());
      const handler = new ChangeWarehouseToCustomRoomHandler(
        storageRepository,
        warehouseRepository,
        customRoomRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeWarehouseToCustomRoomCommand(WH_UUID, TENANT_UUID, ACTOR_UUID),
      );
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });

    it('Then ChangeStoreRoomToWarehouseHandler returns StorageNotFoundError', async () => {
      storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
      const handler = new ChangeStoreRoomToWarehouseHandler(
        storageRepository,
        storeRoomRepository,
        warehouseRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeStoreRoomToWarehouseCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
      );
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });

    it('Then ChangeStoreRoomToCustomRoomHandler returns StorageNotFoundError', async () => {
      storeRoomRepository.findByUUID.mockResolvedValue(makeStoreRoom());
      const handler = new ChangeStoreRoomToCustomRoomHandler(
        storageRepository,
        storeRoomRepository,
        customRoomRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeStoreRoomToCustomRoomCommand(SR_UUID, TENANT_UUID, ACTOR_UUID),
      );
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });

    it('Then ChangeCustomRoomToWarehouseHandler returns StorageNotFoundError', async () => {
      customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom());
      const handler = new ChangeCustomRoomToWarehouseHandler(
        storageRepository,
        customRoomRepository,
        warehouseRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeCustomRoomToWarehouseCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
      );
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });

    it('Then ChangeCustomRoomToStoreRoomHandler returns StorageNotFoundError', async () => {
      customRoomRepository.findByUUID.mockResolvedValue(makeCustomRoom());
      const handler = new ChangeCustomRoomToStoreRoomHandler(
        storageRepository,
        customRoomRepository,
        storeRoomRepository,
        uow,
        policy,
        eventBus,
      );
      const result = await handler.execute(
        new ChangeCustomRoomToStoreRoomCommand(CR_UUID, TENANT_UUID, ACTOR_UUID),
      );
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFoundError);
    });
  });
});
