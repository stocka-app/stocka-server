import { CustomRoomLimitReachedError } from '@storage/application/errors/custom-room-limit-reached.error';
import { StoreRoomLimitReachedError } from '@storage/application/errors/store-room-limit-reached.error';
import { WarehouseRequiresTierUpgradeError } from '@storage/application/errors/warehouse-requires-tier-upgrade.error';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import type {
  ITenantCapabilitiesPort,
  TenantCapabilities,
} from '@storage/application/ports/tenant-capabilities.port';
import { StorageTypeChangePolicy } from '@storage/application/services/storage-type-change.policy';
import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';
import { StoreRoomAggregate } from '@storage/domain/aggregates/store-room.aggregate';
import { WarehouseAggregate } from '@storage/domain/aggregates/warehouse.aggregate';
import type { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import type { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import type { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { StorageAddressRequiredForWarehouseError } from '@storage/domain/errors/storage-address-required-for-warehouse.error';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000099';
const STORAGE_UUID = '019538a0-0000-7000-8000-000000000010';

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

function makePort(capabilities: TenantCapabilities): jest.Mocked<ITenantCapabilitiesPort> {
  return {
    getCapabilities: jest.fn().mockResolvedValue(capabilities),
  };
}

function makeWarehouseRepoStub(count = 0): jest.Mocked<IWarehouseRepository> {
  return {
    count: jest.fn().mockResolvedValue(count),
    findByUUID: jest.fn(),
    save: jest.fn(),
    deleteByUUID: jest.fn(),
  };
}

function makeStoreRoomRepoStub(count = 0): jest.Mocked<IStoreRoomRepository> {
  return {
    count: jest.fn().mockResolvedValue(count),
    findByUUID: jest.fn(),
    save: jest.fn(),
    deleteByUUID: jest.fn(),
  };
}

function makeCustomRoomRepoStub(count = 0): jest.Mocked<ICustomRoomRepository> {
  return {
    count: jest.fn().mockResolvedValue(count),
    findByUUID: jest.fn(),
    save: jest.fn(),
    deleteByUUID: jest.fn(),
  };
}

// ─── StorageItemViewMapper ────────────────────────────────────────────────────

describe('StorageItemViewMapper', () => {
  describe('Given a Warehouse aggregate', () => {
    describe('When fromWarehouse() is called', () => {
      it('Then it returns a Warehouse-typed view with address populated and roomType null', () => {
        const aggregate = WarehouseAggregate.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'Main',
          icon: 'icon',
          color: '#000000',
          address: 'addr',
          description: 'description text',
        });

        const view = StorageItemViewMapper.fromWarehouse(aggregate);

        expect(view.type).toBe(StorageType.WAREHOUSE);
        expect(view.uuid).toBe(STORAGE_UUID);
        expect(view.address).toBe('addr');
        expect(view.roomType).toBeNull();
        expect(view.status).toBe(StorageStatus.ACTIVE);
        expect(view.description).toBe('description text');
      });
    });
  });

  describe('Given a StoreRoom aggregate without an address', () => {
    describe('When fromStoreRoom() is called', () => {
      it('Then it returns a StoreRoom view with address null', () => {
        const aggregate = StoreRoomAggregate.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'SR',
          icon: 'icon',
          color: '#000000',
        });

        const view = StorageItemViewMapper.fromStoreRoom(aggregate);

        expect(view.type).toBe(StorageType.STORE_ROOM);
        expect(view.address).toBeNull();
        expect(view.roomType).toBeNull();
        expect(view.description).toBeNull();
      });
    });
  });

  describe('Given a CustomRoom aggregate', () => {
    describe('When fromCustomRoom() is called', () => {
      it('Then it returns a CustomRoom view with the roomType set', () => {
        const aggregate = CustomRoomAggregate.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'CR',
          icon: 'icon',
          color: '#000000',
          roomType: 'Server Closet',
          address: 'addr',
        });

        const view = StorageItemViewMapper.fromCustomRoom(aggregate);

        expect(view.type).toBe(StorageType.CUSTOM_ROOM);
        expect(view.roomType).toBe('Server Closet');
        expect(view.address).toBe('addr');
      });
    });
  });
});

// ─── StorageTypeChangePolicy ──────────────────────────────────────────────────

describe('StorageTypeChangePolicy', () => {
  describe('assertWarehouseCapacity', () => {
    describe('Given a tenant whose plan does not allow warehouses at all', () => {
      it('Then it returns WarehouseRequiresTierUpgradeError', async () => {
        const policy = new StorageTypeChangePolicy(
          makePort(buildCapabilities({ canCreateWarehouse: () => false })),
          makeWarehouseRepoStub(),
          makeStoreRoomRepoStub(),
          makeCustomRoomRepoStub(),
        );

        const result = await policy.assertWarehouseCapacity(TENANT_UUID);
        expect(result).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
      });
    });

    describe('Given a tenant at the warehouse cap', () => {
      it('Then it returns WarehouseRequiresTierUpgradeError', async () => {
        const policy = new StorageTypeChangePolicy(
          makePort(buildCapabilities({ canCreateMoreWarehouses: (count) => count < 3 })),
          makeWarehouseRepoStub(3),
          makeStoreRoomRepoStub(),
          makeCustomRoomRepoStub(),
        );

        expect(await policy.assertWarehouseCapacity(TENANT_UUID)).toBeInstanceOf(
          WarehouseRequiresTierUpgradeError,
        );
      });
    });

    describe('Given a tenant within capacity', () => {
      it('Then it returns null', async () => {
        const policy = new StorageTypeChangePolicy(
          makePort(buildCapabilities()),
          makeWarehouseRepoStub(0),
          makeStoreRoomRepoStub(),
          makeCustomRoomRepoStub(),
        );

        expect(await policy.assertWarehouseCapacity(TENANT_UUID)).toBeNull();
      });
    });
  });

  describe('assertStoreRoomCapacity', () => {
    describe('Given a tenant at the store-room cap', () => {
      it('Then it returns StoreRoomLimitReachedError', async () => {
        const policy = new StorageTypeChangePolicy(
          makePort(buildCapabilities({ canCreateMoreStoreRooms: (count) => count < 5 })),
          makeWarehouseRepoStub(),
          makeStoreRoomRepoStub(5),
          makeCustomRoomRepoStub(),
        );

        expect(await policy.assertStoreRoomCapacity(TENANT_UUID)).toBeInstanceOf(
          StoreRoomLimitReachedError,
        );
      });
    });

    describe('Given a tenant within capacity', () => {
      it('Then it returns null', async () => {
        const policy = new StorageTypeChangePolicy(
          makePort(buildCapabilities()),
          makeWarehouseRepoStub(),
          makeStoreRoomRepoStub(),
          makeCustomRoomRepoStub(),
        );

        expect(await policy.assertStoreRoomCapacity(TENANT_UUID)).toBeNull();
      });
    });
  });

  describe('assertCustomRoomCapacity', () => {
    describe('Given a tenant at the custom-room cap', () => {
      it('Then it returns CustomRoomLimitReachedError', async () => {
        const policy = new StorageTypeChangePolicy(
          makePort(buildCapabilities({ canCreateMoreCustomRooms: (count) => count < 10 })),
          makeWarehouseRepoStub(),
          makeStoreRoomRepoStub(),
          makeCustomRoomRepoStub(10),
        );

        expect(await policy.assertCustomRoomCapacity(TENANT_UUID)).toBeInstanceOf(
          CustomRoomLimitReachedError,
        );
      });
    });

    describe('Given a tenant within capacity', () => {
      it('Then it returns null', async () => {
        const policy = new StorageTypeChangePolicy(
          makePort(buildCapabilities()),
          makeWarehouseRepoStub(),
          makeStoreRoomRepoStub(),
          makeCustomRoomRepoStub(),
        );

        expect(await policy.assertCustomRoomCapacity(TENANT_UUID)).toBeNull();
      });
    });
  });

  describe('assertWarehouseCanRestore', () => {
    describe('Given a plan that no longer allows warehouses', () => {
      it('Then it returns WarehouseRequiresTierUpgradeError', async () => {
        const policy = new StorageTypeChangePolicy(
          makePort(buildCapabilities({ canCreateWarehouse: () => false })),
          makeWarehouseRepoStub(),
          makeStoreRoomRepoStub(),
          makeCustomRoomRepoStub(),
        );

        expect(await policy.assertWarehouseCanRestore(TENANT_UUID)).toBeInstanceOf(
          WarehouseRequiresTierUpgradeError,
        );
      });
    });

    describe('Given a count strictly above the new warehouse limit (post-downgrade)', () => {
      it('Then it returns WarehouseRequiresTierUpgradeError', async () => {
        const policy = new StorageTypeChangePolicy(
          makePort(buildCapabilities({ exceedsWarehouseLimit: () => true })),
          makeWarehouseRepoStub(4),
          makeStoreRoomRepoStub(),
          makeCustomRoomRepoStub(),
        );

        expect(await policy.assertWarehouseCanRestore(TENANT_UUID)).toBeInstanceOf(
          WarehouseRequiresTierUpgradeError,
        );
      });
    });

    describe('Given a count at the limit (not strictly above)', () => {
      it('Then it allows the restore (returns null)', async () => {
        const policy = new StorageTypeChangePolicy(
          makePort(buildCapabilities()),
          makeWarehouseRepoStub(3),
          makeStoreRoomRepoStub(),
          makeCustomRoomRepoStub(),
        );

        expect(await policy.assertWarehouseCanRestore(TENANT_UUID)).toBeNull();
      });
    });
  });

  describe('assertStoreRoomCanRestore', () => {
    describe('Given a count strictly above the limit', () => {
      it('Then it returns StoreRoomLimitReachedError', async () => {
        const policy = new StorageTypeChangePolicy(
          makePort(buildCapabilities({ exceedsStoreRoomLimit: () => true })),
          makeWarehouseRepoStub(),
          makeStoreRoomRepoStub(6),
          makeCustomRoomRepoStub(),
        );

        expect(await policy.assertStoreRoomCanRestore(TENANT_UUID)).toBeInstanceOf(
          StoreRoomLimitReachedError,
        );
      });
    });

    describe('Given a count within capacity', () => {
      it('Then it allows the restore', async () => {
        const policy = new StorageTypeChangePolicy(
          makePort(buildCapabilities()),
          makeWarehouseRepoStub(),
          makeStoreRoomRepoStub(),
          makeCustomRoomRepoStub(),
        );

        expect(await policy.assertStoreRoomCanRestore(TENANT_UUID)).toBeNull();
      });
    });
  });

  describe('assertCustomRoomCanRestore', () => {
    describe('Given a count strictly above the limit', () => {
      it('Then it returns CustomRoomLimitReachedError', async () => {
        const policy = new StorageTypeChangePolicy(
          makePort(buildCapabilities({ exceedsCustomRoomLimit: () => true })),
          makeWarehouseRepoStub(),
          makeStoreRoomRepoStub(),
          makeCustomRoomRepoStub(11),
        );

        expect(await policy.assertCustomRoomCanRestore(TENANT_UUID)).toBeInstanceOf(
          CustomRoomLimitReachedError,
        );
      });
    });

    describe('Given a count within capacity', () => {
      it('Then it allows the restore', async () => {
        const policy = new StorageTypeChangePolicy(
          makePort(buildCapabilities()),
          makeWarehouseRepoStub(),
          makeStoreRoomRepoStub(),
          makeCustomRoomRepoStub(),
        );

        expect(await policy.assertCustomRoomCanRestore(TENANT_UUID)).toBeNull();
      });
    });
  });

  describe('assertAddressForWarehouse', () => {
    let policy: StorageTypeChangePolicy;

    beforeEach(() => {
      policy = new StorageTypeChangePolicy(
        makePort(buildCapabilities()),
        makeWarehouseRepoStub(),
        makeStoreRoomRepoStub(),
        makeCustomRoomRepoStub(),
      );
    });

    describe('Given an empty (whitespace-only) address', () => {
      it('Then it returns StorageAddressRequiredForWarehouseError', () => {
        const result = policy.assertAddressForWarehouse('   ', STORAGE_UUID);
        expect(result).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
      });
    });

    describe('Given a non-empty address', () => {
      it('Then it returns null', () => {
        expect(policy.assertAddressForWarehouse('500 Industrial Ave', STORAGE_UUID)).toBeNull();
      });
    });
  });
});
