import { EventBus } from '@nestjs/cqrs';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageItemViewMapper } from '@storage/application/mappers/storage-item-view.mapper';
import { StorageTypeChangePolicy } from '@storage/application/services/storage-type-change.policy';
import { StorageUpdateEventsPublisher } from '@storage/application/services/storage-update-events.publisher';
import {
  ITenantCapabilitiesPort,
  TenantCapabilities,
} from '@storage/application/ports/tenant-capabilities.port';
import { ICustomRoomRepository } from '@storage/domain/contracts/custom-room.repository.contract';
import { IStoreRoomRepository } from '@storage/domain/contracts/store-room.repository.contract';
import { IWarehouseRepository } from '@storage/domain/contracts/warehouse.repository.contract';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';
import { WarehouseModel } from '@storage/domain/models/warehouse.model';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { CustomRoomLimitReachedError } from '@storage/application/errors/custom-room-limit-reached.error';
import { StoreRoomLimitReachedError } from '@storage/application/errors/store-room-limit-reached.error';
import { WarehouseRequiresTierUpgradeError } from '@storage/application/errors/warehouse-requires-tier-upgrade.error';
import { StorageAddressRequiredForWarehouseError } from '@storage/domain/errors/storage-address-required-for-warehouse.error';
import { StorageNameVO } from '@storage/domain/value-objects/storage-name.vo';
import { StorageDescriptionVO } from '@storage/domain/value-objects/storage-description.vo';
import { StorageIconVO } from '@storage/domain/value-objects/storage-icon.vo';
import { StorageColorVO } from '@storage/domain/value-objects/storage-color.vo';
import { StorageAddressVO } from '@storage/domain/value-objects/storage-address.vo';
import { RoomTypeNameVO } from '@storage/domain/value-objects/room-type-name.vo';
import { StorageNameChangedEvent } from '@storage/domain/events/storage-name-changed.event';
import { StorageDescriptionChangedEvent } from '@storage/domain/events/storage-description-changed.event';
import { StorageAddressChangedEvent } from '@storage/domain/events/storage-address-changed.event';
import { StorageIconChangedEvent } from '@storage/domain/events/storage-icon-changed.event';
import { StorageColorChangedEvent } from '@storage/domain/events/storage-color-changed.event';
import { StorageTypeChangedEvent } from '@storage/domain/events/storage-type-changed.event';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000099';
const WH_UUID = '019538a0-0000-7000-8000-000000000010';
const SR_UUID = '019538a0-0000-7000-8000-000000000020';
const CR_UUID = '019538a0-0000-7000-8000-000000000030';

function makeWarehouse(overrides: Partial<{ name: string }> = {}): WarehouseModel {
  return WarehouseModel.reconstitute({
    id: 1,
    uuid: new UUIDVO(WH_UUID),
    tenantUUID: new UUIDVO(TENANT_UUID),
    name: new StorageNameVO(overrides.name ?? 'Main Warehouse'),
    description: new StorageDescriptionVO('Primary warehouse'),
    icon: new StorageIconVO('warehouse'),
    color: new StorageColorVO('#3b82f6'),
    address: new StorageAddressVO('789 Industrial'),
    archivedAt: null,
    frozenAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  });
}

function makeStoreRoom(): StoreRoomModel {
  return StoreRoomModel.reconstitute({
    id: 2,
    uuid: new UUIDVO(SR_UUID),
    tenantUUID: new UUIDVO(TENANT_UUID),
    name: new StorageNameVO('Main Store Room'),
    description: null,
    icon: new StorageIconVO('inventory_2'),
    color: new StorageColorVO('#d97706'),
    address: new StorageAddressVO('456 Oak'),
    archivedAt: null,
    frozenAt: null,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  });
}

function makeCustomRoom(overrides: Partial<{ roomType: string }> = {}): CustomRoomModel {
  return CustomRoomModel.reconstitute({
    id: 3,
    uuid: new UUIDVO(CR_UUID),
    tenantUUID: new UUIDVO(TENANT_UUID),
    name: StorageNameVO.create('Staff Break Room'),
    description: StorageDescriptionVO.create('Quiet zone'),
    icon: StorageIconVO.create('coffee'),
    color: StorageColorVO.create('#6b7280'),
    roomType: RoomTypeNameVO.create(overrides.roomType ?? 'Break Room'),
    address: StorageAddressVO.create('123 Main'),
    archivedAt: null,
    frozenAt: null,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  });
}

// ── StorageItemViewMapper ───────────────────────────────────────────────────────

describe('StorageItemViewMapper', () => {
  describe('Given a WarehouseModel', () => {
    describe('When fromWarehouse() is called', () => {
      it('Then the view reflects every field with type WAREHOUSE and roomType null', () => {
        const view = StorageItemViewMapper.fromWarehouse(makeWarehouse());

        expect(view.uuid).toBe(WH_UUID);
        expect(view.type).toBe(StorageType.WAREHOUSE);
        expect(view.name).toBe('Main Warehouse');
        expect(view.description).toBe('Primary warehouse');
        expect(view.icon).toBe('warehouse');
        expect(view.color).toBe('#3b82f6');
        expect(view.address).toBe('789 Industrial');
        expect(view.archivedAt).toBeNull();
        expect(view.frozenAt).toBeNull();
        expect(view.status).toBe(StorageStatus.ACTIVE);
        expect(view.roomType).toBeNull();
      });
    });
  });

  describe('Given a StoreRoomModel with a null description', () => {
    describe('When fromStoreRoom() is called', () => {
      it('Then description is null and roomType is null', () => {
        const view = StorageItemViewMapper.fromStoreRoom(makeStoreRoom());

        expect(view.type).toBe(StorageType.STORE_ROOM);
        expect(view.description).toBeNull();
        expect(view.roomType).toBeNull();
      });
    });
  });

  describe('Given a CustomRoomModel', () => {
    describe('When fromCustomRoom() is called', () => {
      it('Then the view surfaces the roomType string', () => {
        const view = StorageItemViewMapper.fromCustomRoom(makeCustomRoom());

        expect(view.type).toBe(StorageType.CUSTOM_ROOM);
        expect(view.roomType).toBe('Break Room');
      });
    });
  });

  describe('Given a StoreRoomModel without an address', () => {
    describe('When fromStoreRoom() is called', () => {
      it('Then address is null in the view', () => {
        const model = StoreRoomModel.reconstitute({
          id: 2,
          uuid: new UUIDVO(SR_UUID),
          tenantUUID: new UUIDVO(TENANT_UUID),
          name: new StorageNameVO('Main Store Room'),
          description: null,
          icon: new StorageIconVO('inventory_2'),
          color: new StorageColorVO('#d97706'),
          address: null,
          archivedAt: null,
          frozenAt: null,
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-02-01'),
        });

        const view = StorageItemViewMapper.fromStoreRoom(model);

        expect(view.address).toBeNull();
      });
    });
  });

  describe('Given a CustomRoomModel without an address', () => {
    describe('When fromCustomRoom() is called', () => {
      it('Then address is null in the view', () => {
        const model = CustomRoomModel.reconstitute({
          id: 3,
          uuid: new UUIDVO(CR_UUID),
          tenantUUID: new UUIDVO(TENANT_UUID),
          name: StorageNameVO.create('Staff Break Room'),
          description: null,
          icon: StorageIconVO.create('coffee'),
          color: StorageColorVO.create('#6b7280'),
          roomType: RoomTypeNameVO.create('Break Room'),
          address: null,
          archivedAt: null,
          frozenAt: null,
          createdAt: new Date('2024-03-01'),
          updatedAt: new Date('2024-03-01'),
        });

        const view = StorageItemViewMapper.fromCustomRoom(model);

        expect(view.address).toBeNull();
      });
    });
  });
});

// ── StorageUpdateEventsPublisher ────────────────────────────────────────────────

describe('StorageUpdateEventsPublisher', () => {
  let eventBus: jest.Mocked<EventBus>;
  let publisher: StorageUpdateEventsPublisher;

  beforeEach(() => {
    eventBus = { publish: jest.fn() } as unknown as jest.Mocked<EventBus>;
    publisher = new StorageUpdateEventsPublisher(eventBus);
  });

  describe('Given a warehouse whose name changed', () => {
    describe('When publish() runs', () => {
      it('Then a single StorageNameChangedEvent is emitted with before/after', () => {
        const before = makeWarehouse({ name: 'Old Name' });
        const after = before.update({ name: 'New Name' });

        publisher.publish({
          uuid: WH_UUID,
          tenantUUID: new UUIDVO(TENANT_UUID).toString(),
          actorUUID: ACTOR_UUID,
          before,
          after,
          fields: { name: 'New Name' },
        });

        expect(eventBus.publish).toHaveBeenCalledTimes(1);
        const event = eventBus.publish.mock.calls[0][0] as StorageNameChangedEvent;
        expect(event).toBeInstanceOf(StorageNameChangedEvent);
        expect(event.previousName).toBe('Old Name');
        expect(event.newName).toBe('New Name');
      });
    });
  });

  describe('Given no fields actually changed', () => {
    describe('When publish() runs with the same name as before', () => {
      it('Then no events are emitted', () => {
        const before = makeWarehouse({ name: 'Same Name' });

        publisher.publish({
          uuid: WH_UUID,
          tenantUUID: new UUIDVO(TENANT_UUID).toString(),
          actorUUID: ACTOR_UUID,
          before,
          after: before,
          fields: { name: 'Same Name' },
        });

        expect(eventBus.publish).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a warehouse whose description went from null to a value', () => {
    describe('When publish() runs', () => {
      it('Then StorageDescriptionChangedEvent is emitted with null→value', () => {
        const before = makeStoreRoom();
        const after = before.update({ description: 'A new description' });

        publisher.publish({
          uuid: SR_UUID,
          tenantUUID: new UUIDVO(TENANT_UUID).toString(),
          actorUUID: ACTOR_UUID,
          before,
          after,
          fields: { description: 'A new description' },
        });

        const event = eventBus.publish.mock.calls[0][0] as StorageDescriptionChangedEvent;
        expect(event).toBeInstanceOf(StorageDescriptionChangedEvent);
        expect(event.previousValue).toBeNull();
        expect(event.newValue).toBe('A new description');
      });
    });
  });

  describe('Given a warehouse whose description goes from a value to another value', () => {
    describe('When publish() runs', () => {
      it('Then StorageDescriptionChangedEvent is emitted with prev→next (non-null on both sides)', () => {
        const before = makeWarehouse();
        const after = before.update({ description: 'Updated description' });

        publisher.publish({
          uuid: WH_UUID,
          tenantUUID: new UUIDVO(TENANT_UUID).toString(),
          actorUUID: ACTOR_UUID,
          before,
          after,
          fields: { description: 'Updated description' },
        });

        const event = eventBus.publish.mock.calls[0][0] as StorageDescriptionChangedEvent;
        expect(event).toBeInstanceOf(StorageDescriptionChangedEvent);
        expect(event.previousValue).toBe('Primary warehouse');
        expect(event.newValue).toBe('Updated description');
      });
    });
  });

  describe('Given a warehouse whose description does not change', () => {
    describe('When publish() runs with the same description', () => {
      it('Then no StorageDescriptionChangedEvent is emitted', () => {
        const before = makeWarehouse();

        publisher.publish({
          uuid: WH_UUID,
          tenantUUID: new UUIDVO(TENANT_UUID).toString(),
          actorUUID: ACTOR_UUID,
          before,
          after: before,
          fields: { description: 'Primary warehouse' },
        });

        expect(eventBus.publish).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a warehouse whose description is cleared from a value to null', () => {
    describe('When publish() runs', () => {
      it('Then StorageDescriptionChangedEvent is emitted with value→null', () => {
        const before = makeWarehouse();
        const after = before.update({ description: null });

        publisher.publish({
          uuid: WH_UUID,
          tenantUUID: new UUIDVO(TENANT_UUID).toString(),
          actorUUID: ACTOR_UUID,
          before,
          after,
          fields: { description: null },
        });

        const event = eventBus.publish.mock.calls[0][0] as StorageDescriptionChangedEvent;
        expect(event).toBeInstanceOf(StorageDescriptionChangedEvent);
        expect(event.previousValue).toBe('Primary warehouse');
        expect(event.newValue).toBeNull();
      });
    });
  });

  describe('Given a store room whose address fields are equal before and after', () => {
    describe('When publish() runs with address in fields', () => {
      it('Then no StorageAddressChangedEvent is emitted', () => {
        const before = makeStoreRoom();

        publisher.publish({
          uuid: SR_UUID,
          tenantUUID: new UUIDVO(TENANT_UUID).toString(),
          actorUUID: ACTOR_UUID,
          before,
          after: before,
          fields: { address: '456 Oak' },
        });

        const addressEvents = eventBus.publish.mock.calls.filter(
          (c) =>
            (c[0] as { constructor: { name: string } }).constructor.name ===
            'StorageAddressChangedEvent',
        );
        expect(addressEvents).toHaveLength(0);
      });
    });
  });

  describe('Given a custom room whose address goes from null to a new value', () => {
    describe('When publish() runs', () => {
      it('Then StorageAddressChangedEvent fires with previousValue null', () => {
        const before = CustomRoomModel.reconstitute({
          id: 3,
          uuid: new UUIDVO(CR_UUID),
          tenantUUID: new UUIDVO(TENANT_UUID),
          name: StorageNameVO.create('Quiet Room'),
          description: null,
          icon: StorageIconVO.create('coffee'),
          color: StorageColorVO.create('#6b7280'),
          roomType: RoomTypeNameVO.create('Break Room'),
          address: null,
          archivedAt: null,
          frozenAt: null,
          createdAt: new Date('2024-03-01'),
          updatedAt: new Date('2024-03-01'),
        });
        const after = before.update({ address: '500 Newly Set' });

        publisher.publish({
          uuid: CR_UUID,
          tenantUUID: new UUIDVO(TENANT_UUID).toString(),
          actorUUID: ACTOR_UUID,
          before,
          after,
          fields: { address: '500 Newly Set' },
        });

        const event = eventBus.publish.mock.calls[0][0] as StorageAddressChangedEvent;
        expect(event).toBeInstanceOf(StorageAddressChangedEvent);
        expect(event.previousValue).toBeNull();
        expect(event.newValue).toBe('500 Newly Set');
      });
    });
  });

  describe('Given a custom room whose address is cleared from a value to null', () => {
    describe('When publish() runs', () => {
      it('Then StorageAddressChangedEvent fires with newValue null', () => {
        const before = makeCustomRoom();
        const after = before.update({ address: null });

        publisher.publish({
          uuid: CR_UUID,
          tenantUUID: new UUIDVO(TENANT_UUID).toString(),
          actorUUID: ACTOR_UUID,
          before,
          after,
          fields: { address: null },
        });

        const event = eventBus.publish.mock.calls[0][0] as StorageAddressChangedEvent;
        expect(event).toBeInstanceOf(StorageAddressChangedEvent);
        expect(event.previousValue).toBe('123 Main');
        expect(event.newValue).toBeNull();
      });
    });
  });

  describe('Given a custom room whose address, icon and color changed together', () => {
    describe('When publish() runs', () => {
      it('Then three events fire — one per changed field', () => {
        const before = makeCustomRoom();
        const after = before.update({
          address: '999 New Way',
          icon: 'star',
          color: '#ff00ff',
        });

        publisher.publish({
          uuid: CR_UUID,
          tenantUUID: new UUIDVO(TENANT_UUID).toString(),
          actorUUID: ACTOR_UUID,
          before,
          after,
          fields: { address: '999 New Way', icon: 'star', color: '#ff00ff' },
        });

        const types = eventBus.publish.mock.calls.map(
          (c) => (c[0] as { constructor: { name: string } }).constructor.name,
        );
        expect(types).toContain('StorageAddressChangedEvent');
        expect(types).toContain('StorageIconChangedEvent');
        expect(types).toContain('StorageColorChangedEvent');
        expect(eventBus.publish).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Given a custom room whose roomType changed', () => {
    describe('When publish() runs', () => {
      it('Then StorageTypeChangedEvent is emitted with before/after roomType', () => {
        const before = makeCustomRoom({ roomType: 'Break Room' });
        const after = before.update({ roomType: 'Kitchen' });

        publisher.publish({
          uuid: CR_UUID,
          tenantUUID: new UUIDVO(TENANT_UUID).toString(),
          actorUUID: ACTOR_UUID,
          before,
          after,
          fields: { roomType: 'Kitchen' },
        });

        expect(eventBus.publish).toHaveBeenCalledTimes(1);
        const event = eventBus.publish.mock.calls[0][0] as StorageTypeChangedEvent;
        expect(event).toBeInstanceOf(StorageTypeChangedEvent);
        expect(event.previousValue).toBe('Break Room');
        expect(event.newValue).toBe('Kitchen');
      });
    });
  });

  describe('Given a non-custom room whose roomType is passed in fields', () => {
    describe('When publish() runs', () => {
      it('Then no StorageTypeChangedEvent is emitted (only custom-rooms carry a roomType)', () => {
        const before = makeWarehouse();
        const after = before.update({});

        publisher.publish({
          uuid: WH_UUID,
          tenantUUID: new UUIDVO(TENANT_UUID).toString(),
          actorUUID: ACTOR_UUID,
          before,
          after,
          fields: { roomType: 'Does Not Apply' },
        });

        expect(eventBus.publish).not.toHaveBeenCalled();
      });
    });
  });
});

// ── StorageTypeChangePolicy ─────────────────────────────────────────────────────

describe('StorageTypeChangePolicy', () => {
  let capabilitiesPort: jest.Mocked<ITenantCapabilitiesPort>;
  let warehouseRepository: jest.Mocked<IWarehouseRepository>;
  let storeRoomRepository: jest.Mocked<IStoreRoomRepository>;
  let customRoomRepository: jest.Mocked<ICustomRoomRepository>;
  let capabilities: jest.Mocked<TenantCapabilities>;
  let policy: StorageTypeChangePolicy;

  beforeEach(() => {
    capabilities = {
      canCreateWarehouse: jest.fn().mockReturnValue(true),
      canCreateMoreWarehouses: jest.fn().mockReturnValue(true),
      canCreateMoreStoreRooms: jest.fn().mockReturnValue(true),
      canCreateMoreCustomRooms: jest.fn().mockReturnValue(true),
      exceedsWarehouseLimit: jest.fn().mockReturnValue(false),
      exceedsStoreRoomLimit: jest.fn().mockReturnValue(false),
      exceedsCustomRoomLimit: jest.fn().mockReturnValue(false),
    };
    capabilitiesPort = { getCapabilities: jest.fn().mockResolvedValue(capabilities) };
    warehouseRepository = {
      count: jest.fn().mockResolvedValue(0),
      findByUUID: jest.fn(),
      save: jest.fn(),
      deleteByUUID: jest.fn(),
    };
    storeRoomRepository = {
      count: jest.fn().mockResolvedValue(0),
      findByUUID: jest.fn(),
      save: jest.fn(),
      deleteByUUID: jest.fn(),
    };
    customRoomRepository = {
      count: jest.fn().mockResolvedValue(0),
      findByUUID: jest.fn(),
      save: jest.fn(),
      deleteByUUID: jest.fn(),
    };
    policy = new StorageTypeChangePolicy(
      capabilitiesPort,
      warehouseRepository,
      storeRoomRepository,
      customRoomRepository,
    );
  });

  describe('Given the tenant tier allows warehouses and is below the limit', () => {
    describe('When assertWarehouseCapacity() is called', () => {
      it('Then it returns null (no error)', async () => {
        await expect(policy.assertWarehouseCapacity(TENANT_UUID)).resolves.toBeNull();
      });
    });
  });

  describe('Given the tenant tier does not allow warehouses at all', () => {
    describe('When assertWarehouseCapacity() is called', () => {
      it('Then it returns WarehouseRequiresTierUpgradeError', async () => {
        capabilities.canCreateWarehouse.mockReturnValue(false);

        const result = await policy.assertWarehouseCapacity(TENANT_UUID);

        expect(result).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
      });
    });
  });

  describe('Given the tenant tier allows warehouses but is at the limit', () => {
    describe('When assertWarehouseCapacity() is called', () => {
      it('Then it returns WarehouseRequiresTierUpgradeError', async () => {
        capabilities.canCreateMoreWarehouses.mockReturnValue(false);
        warehouseRepository.count.mockResolvedValue(3);

        const result = await policy.assertWarehouseCapacity(TENANT_UUID);

        expect(result).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
      });
    });
  });

  describe('Given the tenant is below the store-room limit', () => {
    describe('When assertStoreRoomCapacity() is called', () => {
      it('Then it returns null (no error)', async () => {
        await expect(policy.assertStoreRoomCapacity(TENANT_UUID)).resolves.toBeNull();
      });
    });
  });

  describe('Given the tenant is at the store-room limit', () => {
    describe('When assertStoreRoomCapacity() is called', () => {
      it('Then it returns StoreRoomLimitReachedError', async () => {
        capabilities.canCreateMoreStoreRooms.mockReturnValue(false);

        const result = await policy.assertStoreRoomCapacity(TENANT_UUID);

        expect(result).toBeInstanceOf(StoreRoomLimitReachedError);
      });
    });
  });

  describe('Given the tenant is below the custom-room limit', () => {
    describe('When assertCustomRoomCapacity() is called', () => {
      it('Then it returns null (no error)', async () => {
        await expect(policy.assertCustomRoomCapacity(TENANT_UUID)).resolves.toBeNull();
      });
    });
  });

  describe('Given the tenant is at the custom-room limit', () => {
    describe('When assertCustomRoomCapacity() is called', () => {
      it('Then it returns CustomRoomLimitReachedError', async () => {
        capabilities.canCreateMoreCustomRooms.mockReturnValue(false);

        const result = await policy.assertCustomRoomCapacity(TENANT_UUID);

        expect(result).toBeInstanceOf(CustomRoomLimitReachedError);
      });
    });
  });

  // ── Restore-flow capacity guards ────────────────────────────────────────────
  // Restore is a state flip: the archived item is already counted toward the
  // tier limit (count() runs with withDeleted: true since Paso 4). Restoring
  // does NOT increase the total, so being exactly at the limit must NOT block
  // the recovery — only a strict overflow (count > max, possible after a
  // downgrade) should block.

  describe('Given the tenant has the warehouse count exactly equal to the tier limit', () => {
    describe('When the policy is asked whether the tenant can restore an archived warehouse', () => {
      it('Then it returns null because restoring does not increase the count beyond the limit', async () => {
        capabilities.canCreateWarehouse.mockReturnValue(true);
        capabilities.canCreateMoreWarehouses.mockReturnValue(false); // 5 < 5 → false (create-style guard)
        warehouseRepository.count.mockResolvedValue(5);

        const result = await policy.assertWarehouseCanRestore(TENANT_UUID);

        expect(result).toBeNull();
      });
    });
  });

  describe('Given the tenant has the warehouse count strictly above the tier limit (post-downgrade overflow)', () => {
    describe('When the policy is asked whether the tenant can restore an archived warehouse', () => {
      it('Then it returns WarehouseRequiresTierUpgradeError', async () => {
        capabilities.canCreateWarehouse.mockReturnValue(true);
        warehouseRepository.count.mockResolvedValue(7);
        capabilities.exceedsWarehouseLimit = jest.fn().mockReturnValue(true);

        const result = await policy.assertWarehouseCanRestore(TENANT_UUID);

        expect(result).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
      });
    });
  });

  describe('Given the tenant tier does not allow warehouses at all (FREE)', () => {
    describe('When the policy is asked whether the tenant can restore an archived warehouse', () => {
      it('Then it returns WarehouseRequiresTierUpgradeError before checking the count', async () => {
        capabilities.canCreateWarehouse.mockReturnValue(false);

        const result = await policy.assertWarehouseCanRestore(TENANT_UUID);

        expect(result).toBeInstanceOf(WarehouseRequiresTierUpgradeError);
        expect(warehouseRepository.count).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given the tenant has the store-room count exactly equal to the tier limit', () => {
    describe('When the policy is asked whether the tenant can restore an archived store room', () => {
      it('Then it returns null because restoring does not increase the count beyond the limit', async () => {
        capabilities.canCreateMoreStoreRooms.mockReturnValue(false);
        storeRoomRepository.count.mockResolvedValue(3);

        const result = await policy.assertStoreRoomCanRestore(TENANT_UUID);

        expect(result).toBeNull();
      });
    });
  });

  describe('Given the tenant has the store-room count strictly above the tier limit (post-downgrade overflow)', () => {
    describe('When the policy is asked whether the tenant can restore an archived store room', () => {
      it('Then it returns StoreRoomLimitReachedError', async () => {
        storeRoomRepository.count.mockResolvedValue(5);
        capabilities.exceedsStoreRoomLimit = jest.fn().mockReturnValue(true);

        const result = await policy.assertStoreRoomCanRestore(TENANT_UUID);

        expect(result).toBeInstanceOf(StoreRoomLimitReachedError);
      });
    });
  });

  describe('Given the tenant has the custom-room count exactly equal to the tier limit', () => {
    describe('When the policy is asked whether the tenant can restore an archived custom room', () => {
      it('Then it returns null because restoring does not increase the count beyond the limit', async () => {
        capabilities.canCreateMoreCustomRooms.mockReturnValue(false);
        customRoomRepository.count.mockResolvedValue(3);

        const result = await policy.assertCustomRoomCanRestore(TENANT_UUID);

        expect(result).toBeNull();
      });
    });
  });

  describe('Given the tenant has the custom-room count strictly above the tier limit (post-downgrade overflow)', () => {
    describe('When the policy is asked whether the tenant can restore an archived custom room', () => {
      it('Then it returns CustomRoomLimitReachedError', async () => {
        customRoomRepository.count.mockResolvedValue(5);
        capabilities.exceedsCustomRoomLimit = jest.fn().mockReturnValue(true);

        const result = await policy.assertCustomRoomCanRestore(TENANT_UUID);

        expect(result).toBeInstanceOf(CustomRoomLimitReachedError);
      });
    });
  });

  describe('Given an empty address when converting to WAREHOUSE', () => {
    describe('When assertAddressForWarehouse() is called', () => {
      it('Then it returns StorageAddressRequiredForWarehouseError', () => {
        const result = policy.assertAddressForWarehouse('   ', WH_UUID);

        expect(result).toBeInstanceOf(StorageAddressRequiredForWarehouseError);
      });
    });
  });

  describe('Given a non-empty address', () => {
    describe('When assertAddressForWarehouse() is called', () => {
      it('Then it returns null', () => {
        const result = policy.assertAddressForWarehouse('123 Street', WH_UUID);

        expect(result).toBeNull();
      });
    });
  });
});
