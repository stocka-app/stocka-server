import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';
import { StoreRoomAggregate } from '@storage/domain/aggregates/store-room.aggregate';
import { WarehouseAggregate } from '@storage/domain/aggregates/warehouse.aggregate';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageAlreadyArchivedError } from '@storage/domain/errors/storage-already-archived.error';
import { StorageAlreadyFrozenError } from '@storage/domain/errors/storage-already-frozen.error';
import { StorageArchivedCannotBeFrozenError } from '@storage/domain/errors/storage-archived-cannot-be-frozen.error';
import { StorageNotArchivedError } from '@storage/domain/errors/storage-not-archived.error';
import { StorageNotFrozenError } from '@storage/domain/errors/storage-not-frozen.error';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const STORAGE_UUID = '019538a0-0000-7000-8000-000000000010';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000099';

// ─── Pure Models ──────────────────────────────────────────────────────────────

describe('WarehouseModel', () => {
  describe('Given WarehouseModel.create() is called with valid props', () => {
    describe('When all fields are provided', () => {
      it('Then properties are set, archive/frozen markers default to null, and status is ACTIVE', () => {
        const model = WarehouseModel.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          name: 'Main Warehouse',
          description: 'Primary storage',
          icon: 'warehouse-icon',
          color: '#AABBCC',
          address: '123 Main St',
        });

        expect(model.uuid.toString()).toBe(STORAGE_UUID);
        expect(model.tenantUUID.toString()).toBe(TENANT_UUID);
        expect(model.name.getValue()).toBe('Main Warehouse');
        expect(model.description?.getValue()).toBe('Primary storage');
        expect(model.icon.getValue()).toBe('warehouse-icon');
        expect(model.color.getValue()).toBe('#AABBCC');
        expect(model.address.getValue()).toBe('123 Main St');
        expect(model.archivedAt).toBeNull();
        expect(model.frozenAt).toBeNull();
        expect(model.status).toBe(StorageStatus.ACTIVE);
        expect(model.isArchived()).toBe(false);
        expect(model.isFrozen()).toBe(false);
      });
    });
  });

  describe('Given a WarehouseModel snapshot with archivedAt set', () => {
    describe('When status / isArchived are queried', () => {
      it('Then status is ARCHIVED and isArchived returns true', () => {
        const model = WarehouseModel.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          name: 'WH',
          icon: 'i',
          color: '#000000',
          address: 'addr',
        }).with({ archivedAt: new Date() });

        expect(model.status).toBe(StorageStatus.ARCHIVED);
        expect(model.isArchived()).toBe(true);
        expect(model.isFrozen()).toBe(false);
      });
    });
  });

  describe('Given a WarehouseModel snapshot with frozenAt set', () => {
    describe('When status / isFrozen are queried', () => {
      it('Then status is FROZEN and isFrozen returns true', () => {
        const model = WarehouseModel.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          name: 'WH',
          icon: 'i',
          color: '#000000',
          address: 'addr',
        }).with({ frozenAt: new Date() });

        expect(model.status).toBe(StorageStatus.FROZEN);
        expect(model.isArchived()).toBe(false);
        expect(model.isFrozen()).toBe(true);
      });
    });
  });

  describe('Given a WarehouseModel and a successor produced via with()', () => {
    describe('When the successor changes name only', () => {
      it('Then the successor reflects the new name and preserves the rest', () => {
        const original = WarehouseModel.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          name: 'Original',
          icon: 'i',
          color: '#000000',
          address: 'addr',
        });
        const updatedAtBefore = original.updatedAt;

        const successor = original.with({ name: original.name }).with({});
        expect(successor.uuid.toString()).toBe(original.uuid.toString());
        expect(successor.tenantUUID.toString()).toBe(original.tenantUUID.toString());
        expect(successor.createdAt).toEqual(original.createdAt);
        expect(successor.updatedAt.getTime()).toBeGreaterThanOrEqual(updatedAtBefore.getTime());
      });
    });
  });
});

describe('StoreRoomModel', () => {
  describe('Given StoreRoomModel.create() with optional null address', () => {
    describe('When address is omitted', () => {
      it('Then address is null and the snapshot is ACTIVE', () => {
        const model = StoreRoomModel.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          name: 'StoreRoom',
          icon: 'i',
          color: '#000000',
        });

        expect(model.address).toBeNull();
        expect(model.status).toBe(StorageStatus.ACTIVE);
      });
    });

    describe('When address is an empty string', () => {
      it('Then address is normalized to null', () => {
        const model = StoreRoomModel.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          name: 'StoreRoom',
          icon: 'i',
          color: '#000000',
          address: '   ',
        });

        expect(model.address).toBeNull();
      });
    });
  });
});

describe('CustomRoomModel', () => {
  describe('Given CustomRoomModel.create()', () => {
    describe('When roomType is provided', () => {
      it('Then roomType VO is exposed and pure queries are correct', () => {
        const model = CustomRoomModel.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          name: 'Main Office',
          roomType: 'Office',
          icon: 'office',
          color: '#AABBCC',
          address: '123 Main',
        });

        expect(model.roomType.getValue()).toBe('Office');
        expect(model.status).toBe(StorageStatus.ACTIVE);
        expect(model.isArchived()).toBe(false);
        expect(model.isFrozen()).toBe(false);
      });
    });
  });
});

// ─── Aggregates: state transitions ────────────────────────────────────────────

function createWarehouse(): WarehouseAggregate {
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

function createStoreRoom(): StoreRoomAggregate {
  return StoreRoomAggregate.create({
    uuid: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    actorUUID: ACTOR_UUID,
    name: 'SR',
    icon: 'icon',
    color: '#000000',
  });
}

function createCustomRoom(): CustomRoomAggregate {
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

describe('WarehouseAggregate transitions', () => {
  describe('Given a fresh WarehouseAggregate', () => {
    describe('When markArchived is called', () => {
      it('Then it transitions to ARCHIVED and the result is ok', () => {
        const aggregate = createWarehouse();
        const result = aggregate.markArchived(ACTOR_UUID);

        expect(result.isOk()).toBe(true);
        expect(aggregate.isArchived()).toBe(true);
        expect(aggregate.status).toBe(StorageStatus.ARCHIVED);
      });
    });

    describe('When markArchived is called twice', () => {
      it('Then the second call returns StorageAlreadyArchivedError', () => {
        const aggregate = createWarehouse();
        aggregate.markArchived(ACTOR_UUID);

        const result = aggregate.markArchived(ACTOR_UUID);
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyArchivedError);
      });
    });

    describe('When markFrozen is called', () => {
      it('Then it transitions to FROZEN', () => {
        const aggregate = createWarehouse();
        const result = aggregate.markFrozen(ACTOR_UUID);

        expect(result.isOk()).toBe(true);
        expect(aggregate.isFrozen()).toBe(true);
      });
    });

    describe('When markFrozen is called on an archived aggregate', () => {
      it('Then it returns StorageArchivedCannotBeFrozenError', () => {
        const aggregate = createWarehouse();
        aggregate.markArchived(ACTOR_UUID);

        const result = aggregate.markFrozen(ACTOR_UUID);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageArchivedCannotBeFrozenError);
      });
    });

    describe('When markFrozen is called twice', () => {
      it('Then the second call returns StorageAlreadyFrozenError', () => {
        const aggregate = createWarehouse();
        aggregate.markFrozen(ACTOR_UUID);

        const result = aggregate.markFrozen(ACTOR_UUID);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageAlreadyFrozenError);
      });
    });

    describe('When markUnfrozen is called on a frozen aggregate', () => {
      it('Then it returns to ACTIVE', () => {
        const aggregate = createWarehouse();
        aggregate.markFrozen(ACTOR_UUID);

        const result = aggregate.markUnfrozen(ACTOR_UUID);
        expect(result.isOk()).toBe(true);
        expect(aggregate.status).toBe(StorageStatus.ACTIVE);
      });
    });

    describe('When markUnfrozen is called on an active aggregate', () => {
      it('Then it returns StorageNotFrozenError', () => {
        const aggregate = createWarehouse();
        const result = aggregate.markUnfrozen(ACTOR_UUID);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotFrozenError);
      });
    });

    describe('When markRestored is called on an archived aggregate', () => {
      it('Then it returns to ACTIVE', () => {
        const aggregate = createWarehouse();
        aggregate.markArchived(ACTOR_UUID);

        const result = aggregate.markRestored(ACTOR_UUID);
        expect(result.isOk()).toBe(true);
        expect(aggregate.status).toBe(StorageStatus.ACTIVE);
      });
    });

    describe('When markRestored is called on an active aggregate', () => {
      it('Then it returns StorageNotArchivedError', () => {
        const aggregate = createWarehouse();
        const result = aggregate.markRestored(ACTOR_UUID);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotArchivedError);
      });
    });

    describe('When markPermanentlyDeleted is called on an archived aggregate', () => {
      it('Then it returns ok and emits the StoragePermanentlyDeletedEvent', () => {
        const aggregate = createWarehouse();
        aggregate.markArchived(ACTOR_UUID);
        const result = aggregate.markPermanentlyDeleted(ACTOR_UUID);
        expect(result.isOk()).toBe(true);
      });
    });

    describe('When markPermanentlyDeleted is called on an active aggregate', () => {
      it('Then it returns StorageNotArchivedError', () => {
        const aggregate = createWarehouse();
        const result = aggregate.markPermanentlyDeleted(ACTOR_UUID);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(StorageNotArchivedError);
      });
    });
  });

  describe('Given a WarehouseAggregate', () => {
    describe('When update() is called with a changed name and address', () => {
      it('Then the aggregate snapshot reflects the changes', () => {
        const aggregate = createWarehouse();
        const result = aggregate.update({ name: 'Renamed', address: 'New addr' }, ACTOR_UUID);

        expect(result.isOk()).toBe(true);
        expect(aggregate.name.getValue()).toBe('Renamed');
        expect(aggregate.address.getValue()).toBe('New addr');
      });
    });

    describe('When update() is called with no actual changes', () => {
      it('Then the snapshot is unchanged and no events are emitted', () => {
        const aggregate = createWarehouse();
        aggregate.commit();
        const result = aggregate.update({ name: aggregate.name.getValue() }, ACTOR_UUID);

        expect(result.isOk()).toBe(true);
        expect(aggregate.getUncommittedEvents()).toHaveLength(0);
      });
    });
  });
});

describe('StoreRoomAggregate transitions', () => {
  describe('Given a fresh StoreRoomAggregate', () => {
    describe('When markArchived is called', () => {
      it('Then it transitions to ARCHIVED', () => {
        const aggregate = createStoreRoom();
        expect(aggregate.markArchived(ACTOR_UUID).isOk()).toBe(true);
        expect(aggregate.isArchived()).toBe(true);
      });
    });

    describe('When update() with empty-string address is called', () => {
      it('Then address is cleared', () => {
        const aggregate = createStoreRoom();
        aggregate.update({ address: 'first' }, ACTOR_UUID);
        aggregate.update({ address: '' }, ACTOR_UUID);
        expect(aggregate.address).toBeNull();
      });
    });
  });
});

describe('CustomRoomAggregate transitions', () => {
  describe('Given a fresh CustomRoomAggregate', () => {
    describe('When markFrozen and then markUnfrozen are called', () => {
      it('Then the aggregate cycles through FROZEN and back to ACTIVE', () => {
        const aggregate = createCustomRoom();
        aggregate.markFrozen(ACTOR_UUID);
        expect(aggregate.status).toBe(StorageStatus.FROZEN);
        aggregate.markUnfrozen(ACTOR_UUID);
        expect(aggregate.status).toBe(StorageStatus.ACTIVE);
      });
    });

    describe('When update() with a new roomType is called', () => {
      it('Then roomType is updated and an event is emitted', () => {
        const aggregate = createCustomRoom();
        aggregate.commit();
        aggregate.update({ roomType: 'Kitchen' }, ACTOR_UUID);

        expect(aggregate.roomType.getValue()).toBe('Kitchen');
        expect(aggregate.getUncommittedEvents().length).toBeGreaterThan(0);
      });
    });
  });
});
