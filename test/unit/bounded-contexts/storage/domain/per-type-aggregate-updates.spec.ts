import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { CustomRoomAggregate } from '@storage/domain/aggregates/custom-room.aggregate';
import { StoreRoomAggregate } from '@storage/domain/aggregates/store-room.aggregate';
import { WarehouseAggregate } from '@storage/domain/aggregates/warehouse.aggregate';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000099';
const STORAGE_UUID = '019538a0-0000-7000-8000-000000000010';

describe('WarehouseAggregate.update — full field coverage', () => {
  function buildBase(): WarehouseAggregate {
    return WarehouseAggregate.create({
      uuid: STORAGE_UUID,
      tenantUUID: TENANT_UUID,
      actorUUID: ACTOR_UUID,
      name: 'Original',
      description: 'original description',
      icon: 'box',
      color: '#000000',
      address: 'Old addr',
    });
  }

  describe('Given a warehouse with all fields set', () => {
    describe('When update() is called with new icon, color, name, description, and address', () => {
      it('Then it emits one event per changed field and updates the snapshot', () => {
        const aggregate = buildBase();

        const result = aggregate.update(
          {
            name: 'Renamed',
            description: 'new description',
            icon: 'inventory_2',
            color: '#aabbcc',
            address: 'New address',
          },
          ACTOR_UUID,
        );

        expect(result.isOk()).toBe(true);
        expect(aggregate.name.getValue()).toBe('Renamed');
        expect(aggregate.description?.getValue()).toBe('new description');
        expect(aggregate.icon.getValue()).toBe('inventory_2');
        expect(aggregate.color.getValue()).toBe('#aabbcc');
        expect(aggregate.address.getValue()).toBe('New address');
      });
    });

    describe('When update() is called with the description set to null (clear)', () => {
      it('Then the description becomes null', () => {
        const aggregate = buildBase();

        aggregate.update({ description: null }, ACTOR_UUID);

        expect(aggregate.description).toBeNull();
      });
    });

    describe('When update() is called with the same description (no-op)', () => {
      it('Then no description-changed event is appended', () => {
        const aggregate = buildBase();

        const result = aggregate.update({ description: 'original description' }, ACTOR_UUID);

        expect(result.isOk()).toBe(true);
        expect(aggregate.description?.getValue()).toBe('original description');
      });
    });

    describe('When update() is called with a no-op (same icon as current)', () => {
      it('Then the icon stays unchanged and no icon-changed event is emitted', () => {
        const aggregate = buildBase();

        aggregate.update({ icon: 'box' }, ACTOR_UUID);
        expect(aggregate.icon.getValue()).toBe('box');
      });
    });
  });
});

describe('StoreRoomAggregate.update — full field coverage', () => {
  function buildBase(): StoreRoomAggregate {
    return StoreRoomAggregate.create({
      uuid: STORAGE_UUID,
      tenantUUID: TENANT_UUID,
      actorUUID: ACTOR_UUID,
      name: 'SR-Original',
      description: 'original description',
      icon: 'door_back',
      color: '#000000',
      address: 'Old addr',
    });
  }

  describe('Given a store-room with all fields set', () => {
    describe('When update() changes icon, color and address', () => {
      it('Then the snapshot reflects the new values', () => {
        const aggregate = buildBase();

        aggregate.update(
          {
            icon: 'door_front',
            color: '#abcdef',
            address: 'New addr',
          },
          ACTOR_UUID,
        );

        expect(aggregate.icon.getValue()).toBe('door_front');
        expect(aggregate.color.getValue()).toBe('#abcdef');
        expect(aggregate.address?.getValue()).toBe('New addr');
      });
    });

    describe('When update() clears the address with null', () => {
      it('Then the address becomes null', () => {
        const aggregate = buildBase();

        aggregate.update({ address: null }, ACTOR_UUID);

        expect(aggregate.address).toBeNull();
      });
    });

    describe('When update() empties the address with whitespace', () => {
      it('Then the address becomes null (form-empty case)', () => {
        const aggregate = buildBase();

        aggregate.update({ address: '   ' }, ACTOR_UUID);

        expect(aggregate.address).toBeNull();
      });
    });

    describe('When update() sets the address to its current value', () => {
      it('Then the address is unchanged (no event)', () => {
        const aggregate = buildBase();

        aggregate.update({ address: 'Old addr' }, ACTOR_UUID);

        expect(aggregate.address?.getValue()).toBe('Old addr');
      });
    });

    describe('When update() changes the description to a new value', () => {
      it('Then the description is replaced and a description-changed event is emitted', () => {
        const aggregate = buildBase();

        aggregate.update({ description: 'A different description' }, ACTOR_UUID);

        expect(aggregate.description?.getValue()).toBe('A different description');
      });
    });

    describe('When update() clears the description with null', () => {
      it('Then the description becomes null', () => {
        const aggregate = buildBase();

        aggregate.update({ description: null }, ACTOR_UUID);

        expect(aggregate.description).toBeNull();
      });
    });

    describe('When update() keeps the description (no-op)', () => {
      it('Then nothing changes', () => {
        const aggregate = buildBase();
        aggregate.update({ description: 'original description' }, ACTOR_UUID);
        expect(aggregate.description?.getValue()).toBe('original description');
      });
    });

    describe('When update() keeps the address unchanged (no-op)', () => {
      it('Then no address-changed event is emitted', () => {
        const aggregate = StoreRoomAggregate.create({
          uuid: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          name: 'SR-X',
          icon: 'icon',
          color: '#000000',
        });

        aggregate.update({ address: undefined }, ACTOR_UUID);
        expect(aggregate.address).toBeNull();
      });
    });
  });
});

describe('CustomRoomAggregate.update — full field coverage', () => {
  function buildBase(): CustomRoomAggregate {
    return CustomRoomAggregate.create({
      uuid: STORAGE_UUID,
      tenantUUID: TENANT_UUID,
      actorUUID: ACTOR_UUID,
      name: 'CR-Original',
      description: 'original description',
      icon: 'router',
      color: '#000000',
      roomType: 'Office',
      address: 'Old addr',
    });
  }

  describe('Given a custom-room with all fields set', () => {
    describe('When update() changes icon, color, roomType, and address', () => {
      it('Then the snapshot reflects all changes', () => {
        const aggregate = buildBase();

        aggregate.update(
          {
            icon: 'inventory_2',
            color: '#abcdef',
            roomType: 'Server Closet',
            address: 'IT-Room',
          },
          ACTOR_UUID,
        );

        expect(aggregate.icon.getValue()).toBe('inventory_2');
        expect(aggregate.color.getValue()).toBe('#abcdef');
        expect(aggregate.roomType.getValue()).toBe('Server Closet');
        expect(aggregate.address?.getValue()).toBe('IT-Room');
      });
    });

    describe('When update() clears the address with null', () => {
      it('Then address becomes null', () => {
        const aggregate = buildBase();
        aggregate.update({ address: null }, ACTOR_UUID);
        expect(aggregate.address).toBeNull();
      });
    });

    describe('When update() empties the address with whitespace', () => {
      it('Then address becomes null (form-empty)', () => {
        const aggregate = buildBase();
        aggregate.update({ address: '   ' }, ACTOR_UUID);
        expect(aggregate.address).toBeNull();
      });
    });

    describe('When update() sets the address to its current value', () => {
      it('Then no address-changed event is emitted', () => {
        const aggregate = buildBase();
        aggregate.update({ address: 'Old addr' }, ACTOR_UUID);
        expect(aggregate.address?.getValue()).toBe('Old addr');
      });
    });

    describe('When update() keeps the same roomType', () => {
      it('Then no roomType-changed event is emitted', () => {
        const aggregate = buildBase();
        aggregate.update({ roomType: 'Office' }, ACTOR_UUID);
        expect(aggregate.roomType.getValue()).toBe('Office');
      });
    });

    describe('When update() changes the description to a new value', () => {
      it('Then the description is replaced', () => {
        const aggregate = buildBase();
        aggregate.update({ description: 'A different description' }, ACTOR_UUID);
        expect(aggregate.description?.getValue()).toBe('A different description');
      });
    });

    describe('When update() clears the description with null', () => {
      it('Then the description becomes null', () => {
        const aggregate = buildBase();
        aggregate.update({ description: null }, ACTOR_UUID);
        expect(aggregate.description).toBeNull();
      });
    });

    describe('When update() keeps the description (no-op)', () => {
      it('Then nothing changes', () => {
        const aggregate = buildBase();
        aggregate.update({ description: 'original description' }, ACTOR_UUID);
        expect(aggregate.description?.getValue()).toBe('original description');
      });
    });
  });
});

// ─── Aggregate-level state queries ────────────────────────────────────────────

describe('WarehouseAggregate / StoreRoomAggregate / CustomRoomAggregate getters', () => {
  describe('Given a freshly created warehouse', () => {
    it('Then it exposes ACTIVE status, no archivedAt and no frozenAt', () => {
      const aggregate = WarehouseAggregate.create({
        uuid: STORAGE_UUID,
        tenantUUID: TENANT_UUID,
        actorUUID: ACTOR_UUID,
        name: 'X',
        icon: 'icon',
        color: '#000000',
        address: 'addr',
      });

      expect(aggregate.id).toBeUndefined();
      expect(aggregate.archivedAt).toBeNull();
      expect(aggregate.frozenAt).toBeNull();
      expect(aggregate.createdAt).toBeInstanceOf(Date);
      expect(aggregate.updatedAt).toBeInstanceOf(Date);
      expect(aggregate.isArchived()).toBe(false);
      expect(aggregate.isFrozen()).toBe(false);
      expect(aggregate.model).toBeDefined();
    });
  });

  describe('Given a warehouse that has been archived then a frozen attempt', () => {
    it('Then markFrozen returns StorageArchivedCannotBeFrozenError', () => {
      const aggregate = WarehouseAggregate.create({
        uuid: STORAGE_UUID,
        tenantUUID: TENANT_UUID,
        actorUUID: ACTOR_UUID,
        name: 'X',
        icon: 'icon',
        color: '#000000',
        address: 'addr',
      });
      aggregate.markArchived(ACTOR_UUID);

      const result = aggregate.markFrozen(ACTOR_UUID);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('Given a warehouse already archived', () => {
    it('Then markArchived returns StorageAlreadyArchivedError', () => {
      const aggregate = WarehouseAggregate.create({
        uuid: STORAGE_UUID,
        tenantUUID: TENANT_UUID,
        actorUUID: ACTOR_UUID,
        name: 'X',
        icon: 'icon',
        color: '#000000',
        address: 'addr',
      });
      aggregate.markArchived(ACTOR_UUID);

      const result = aggregate.markArchived(ACTOR_UUID);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('Given a warehouse already frozen and frozen-attempted again', () => {
    it('Then markFrozen returns StorageAlreadyFrozenError', () => {
      const aggregate = WarehouseAggregate.create({
        uuid: STORAGE_UUID,
        tenantUUID: TENANT_UUID,
        actorUUID: ACTOR_UUID,
        name: 'X',
        icon: 'icon',
        color: '#000000',
        address: 'addr',
      });
      aggregate.markFrozen(ACTOR_UUID);

      const result = aggregate.markFrozen(ACTOR_UUID);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('Given a warehouse not frozen', () => {
    it('Then markUnfrozen returns StorageNotFrozenError', () => {
      const aggregate = WarehouseAggregate.create({
        uuid: STORAGE_UUID,
        tenantUUID: TENANT_UUID,
        actorUUID: ACTOR_UUID,
        name: 'X',
        icon: 'icon',
        color: '#000000',
        address: 'addr',
      });

      const result = aggregate.markUnfrozen(ACTOR_UUID);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('Given a warehouse not archived', () => {
    it('Then markRestored returns StorageNotArchivedError', () => {
      const aggregate = WarehouseAggregate.create({
        uuid: STORAGE_UUID,
        tenantUUID: TENANT_UUID,
        actorUUID: ACTOR_UUID,
        name: 'X',
        icon: 'icon',
        color: '#000000',
        address: 'addr',
      });

      const result = aggregate.markRestored(ACTOR_UUID);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('Given a warehouse archived then restored', () => {
    it('Then markRestored returns ok and the aggregate becomes active again', () => {
      const aggregate = WarehouseAggregate.create({
        uuid: STORAGE_UUID,
        tenantUUID: TENANT_UUID,
        actorUUID: ACTOR_UUID,
        name: 'X',
        icon: 'icon',
        color: '#000000',
        address: 'addr',
      });
      aggregate.markArchived(ACTOR_UUID);
      const result = aggregate.markRestored(ACTOR_UUID);
      expect(result.isOk()).toBe(true);
      expect(aggregate.archivedAt).toBeNull();
    });
  });

  describe('Given a warehouse frozen then unfrozen', () => {
    it('Then markUnfrozen succeeds', () => {
      const aggregate = WarehouseAggregate.create({
        uuid: STORAGE_UUID,
        tenantUUID: TENANT_UUID,
        actorUUID: ACTOR_UUID,
        name: 'X',
        icon: 'icon',
        color: '#000000',
        address: 'addr',
      });
      aggregate.markFrozen(ACTOR_UUID);
      const result = aggregate.markUnfrozen(ACTOR_UUID);
      expect(result.isOk()).toBe(true);
      expect(aggregate.frozenAt).toBeNull();
    });
  });
});

// ─── forTypeChange factories ──────────────────────────────────────────────────

describe('Per-type aggregate forTypeChange factories', () => {
  describe('Given WarehouseAggregate.forTypeChange', () => {
    it('Then it produces an aggregate without emitting a StorageCreatedEvent', () => {
      const aggregate = WarehouseAggregate.forTypeChange({
        uuid: STORAGE_UUID,
        tenantUUID: TENANT_UUID,
        name: 'Promoted',
        icon: 'icon',
        color: '#000000',
        address: 'addr',
      });

      expect(aggregate.uuid).toBe(STORAGE_UUID);
      expect(aggregate.getUncommittedEvents()).toHaveLength(0);
    });
  });

  describe('Given StoreRoomAggregate.forTypeChange', () => {
    it('Then it produces an aggregate without emitting a StorageCreatedEvent', () => {
      const aggregate = StoreRoomAggregate.forTypeChange({
        uuid: STORAGE_UUID,
        tenantUUID: TENANT_UUID,
        name: 'Demoted',
        icon: 'icon',
        color: '#000000',
      });

      expect(aggregate.uuid).toBe(STORAGE_UUID);
      expect(aggregate.getUncommittedEvents()).toHaveLength(0);
    });
  });

  describe('Given CustomRoomAggregate.forTypeChange', () => {
    it('Then it produces an aggregate without emitting a StorageCreatedEvent', () => {
      const aggregate = CustomRoomAggregate.forTypeChange({
        uuid: STORAGE_UUID,
        tenantUUID: TENANT_UUID,
        name: 'Repurposed',
        icon: 'icon',
        color: '#000000',
        roomType: 'Office',
      });

      expect(aggregate.uuid).toBe(STORAGE_UUID);
      expect(aggregate.getUncommittedEvents()).toHaveLength(0);
    });
  });
});

// ─── Reconstituted aggregate identity getters ─────────────────────────────────

describe('Reconstituted aggregate identity', () => {
  describe('Given a StoreRoom aggregate reconstituted with a numeric id', () => {
    it('Then aggregate.id returns the persisted id', () => {
      const model = StoreRoomModel.reconstitute({
        id: 99,
        uuid: new UUIDVO(STORAGE_UUID),
        tenantUUID: new UUIDVO(TENANT_UUID),
        name: StorageNameVO.create('SR'),
        description: null,
        icon: StorageIconVO.create('icon'),
        color: StorageColorVO.create('#000000'),
        address: null,
        frozenAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const aggregate = StoreRoomAggregate.reconstitute(model);

      expect(aggregate.id).toBe(99);
    });
  });

  describe('Given a CustomRoom aggregate reconstituted with a numeric id', () => {
    it('Then aggregate.id returns the persisted id', () => {
      const model = CustomRoomModel.reconstitute({
        id: 77,
        uuid: new UUIDVO(STORAGE_UUID),
        tenantUUID: new UUIDVO(TENANT_UUID),
        name: StorageNameVO.create('CR'),
        description: null,
        icon: StorageIconVO.create('icon'),
        color: StorageColorVO.create('#000000'),
        roomType: RoomTypeNameVO.create('Office'),
        address: null,
        frozenAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const aggregate = CustomRoomAggregate.reconstitute(model);

      expect(aggregate.id).toBe(77);
    });
  });
});

// ─── Model derived queries ────────────────────────────────────────────────────

describe('StoreRoomModel derived queries', () => {
  function buildBase(): StoreRoomModel {
    return StoreRoomModel.create({
      uuid: STORAGE_UUID,
      tenantUUID: TENANT_UUID,
      name: 'SR',
      icon: 'icon',
      color: '#000000',
    });
  }

  describe('Given an active store-room (not archived, not frozen)', () => {
    it('Then status is ACTIVE and isFrozen() is false', () => {
      const model = buildBase();
      expect(model.status).toBe(StorageStatus.ACTIVE);
      expect(model.isFrozen()).toBe(false);
    });
  });

  describe('Given a frozen store-room', () => {
    it('Then status is FROZEN and isFrozen() is true', () => {
      const model = buildBase().with({ frozenAt: new Date() });
      expect(model.status).toBe(StorageStatus.FROZEN);
      expect(model.isFrozen()).toBe(true);
    });
  });

  describe('Given an archived store-room (with frozenAt also set)', () => {
    it('Then status is ARCHIVED and isFrozen() returns false (archived overrides frozen)', () => {
      const model = buildBase().with({
        archivedAt: new Date(),
        frozenAt: new Date(),
      });
      expect(model.status).toBe(StorageStatus.ARCHIVED);
      expect(model.isFrozen()).toBe(false);
    });
  });
});

describe('CustomRoomModel derived queries', () => {
  function buildBase(): CustomRoomModel {
    return CustomRoomModel.create({
      uuid: STORAGE_UUID,
      tenantUUID: TENANT_UUID,
      name: 'CR',
      icon: 'icon',
      color: '#000000',
      roomType: 'Office',
    });
  }

  describe('Given an active custom-room', () => {
    it('Then status is ACTIVE and isFrozen() is false', () => {
      const model = buildBase();
      expect(model.status).toBe(StorageStatus.ACTIVE);
      expect(model.isFrozen()).toBe(false);
    });
  });

  describe('Given a frozen custom-room', () => {
    it('Then status is FROZEN and isFrozen() is true', () => {
      const model = buildBase().with({ frozenAt: new Date() });
      expect(model.status).toBe(StorageStatus.FROZEN);
      expect(model.isFrozen()).toBe(true);
    });
  });

  describe('Given an archived custom-room', () => {
    it('Then status is ARCHIVED', () => {
      const model = buildBase().with({ archivedAt: new Date() });
      expect(model.status).toBe(StorageStatus.ARCHIVED);
      expect(model.isFrozen()).toBe(false);
    });
  });
});
