import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageCreatedEvent } from '@storage/domain/events/storage-created.event';
import { StorageUpdatedEvent } from '@storage/domain/events/storage-updated.event';
import { StorageArchivedEvent } from '@storage/domain/events/storage-archived.event';
import { CustomRoomModel } from '@storage/domain/models/custom-room.model';
import { StoreRoomModel } from '@storage/domain/models/store-room.model';

describe('StorageAggregate', () => {
  const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';

  describe('Given a request to create a Custom Room storage', () => {
    describe('When createCustomRoom is called with valid props', () => {
      let aggregate: StorageAggregate;

      beforeEach(() => {
        aggregate = StorageAggregate.createCustomRoom({
          tenantUUID: TENANT_UUID,
          name: 'My Office',
          roomType: 'Office',
          icon: 'office-icon',
          color: '#AABBCC',
          address: '123 Main St',
        });
      });

      it('Then the aggregate has a uuid and type CUSTOM_ROOM', () => {
        expect(aggregate.uuid).toBeDefined();
        expect(aggregate.type).toBe(StorageType.CUSTOM_ROOM);
      });

      it('Then the name and tenantUUID are set', () => {
        expect(aggregate.name).toBe('My Office');
        expect(aggregate.tenantUUID).toBe(TENANT_UUID);
      });

      it('Then description defaults to null when not provided', () => {
        expect(aggregate.description).toBeNull();
      });

      it('Then the customRoom sub-model is populated', () => {
        expect(aggregate.customRoom).not.toBeNull();
        expect(aggregate.customRoom?.roomType.getValue()).toBe('Office');
        expect(aggregate.customRoom?.address.getValue()).toBe('123 Main St');
      });

      it('Then the other sub-models are null', () => {
        expect(aggregate.storeRoom).toBeNull();
        expect(aggregate.warehouse).toBeNull();
      });

      it('Then the address getter returns the custom room address', () => {
        expect(aggregate.address).toBe('123 Main St');
      });

      it('Then a StorageCreatedEvent is emitted', () => {
        const events = aggregate.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(StorageCreatedEvent);
        const event = events[0] as StorageCreatedEvent;
        expect(event.storageUUID).toBe(aggregate.uuid);
        expect(event.tenantUUID).toBe(TENANT_UUID);
        expect(event.type).toBe(StorageType.CUSTOM_ROOM);
        expect(event.name).toBe('My Office');
      });

      it('Then the aggregate is not archived', () => {
        expect(aggregate.isArchived()).toBe(false);
      });
    });

    describe('When createCustomRoom is called with a description', () => {
      it('Then description is stored on the aggregate', () => {
        const aggregate = StorageAggregate.createCustomRoom({
          tenantUUID: TENANT_UUID,
          name: 'Described Room',
          roomType: 'Office',
          icon: 'office-icon',
          color: '#AABBCC',
          address: '456 Oak Ave',
          description: 'Main office space for the team',
        });
        expect(aggregate.description).toBe('Main office space for the team');
      });
    });

    describe('When createCustomRoom is called with a parentUUID', () => {
      it('Then parentUUID is set on the aggregate', () => {
        const parentUUID = '019538a0-0000-7000-8000-000000000002';
        const aggregate = StorageAggregate.createCustomRoom({
          tenantUUID: TENANT_UUID,
          name: 'Child Room',
          roomType: 'Office',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '789 Elm St',
          parentUUID,
        });
        expect(aggregate.parentUUID).toBe(parentUUID);
      });
    });
  });

  describe('Given a request to create a Store Room storage', () => {
    describe('When createStoreRoom is called with valid props', () => {
      let aggregate: StorageAggregate;

      beforeEach(() => {
        aggregate = StorageAggregate.createStoreRoom({
          tenantUUID: TENANT_UUID,
          name: 'Main Store Room',
          icon: 'store-icon',
          color: '#334455',
          address: '456 Oak Ave',
        });
      });

      it('Then the aggregate has type STORE_ROOM', () => {
        expect(aggregate.type).toBe(StorageType.STORE_ROOM);
      });

      it('Then the storeRoom sub-model is populated', () => {
        expect(aggregate.storeRoom).not.toBeNull();
        expect(aggregate.storeRoom?.address.getValue()).toBe('456 Oak Ave');
      });

      it('Then the other sub-models are null', () => {
        expect(aggregate.customRoom).toBeNull();
        expect(aggregate.warehouse).toBeNull();
      });

      it('Then the address getter returns the store room address', () => {
        expect(aggregate.address).toBe('456 Oak Ave');
      });

      it('Then a StorageCreatedEvent is emitted', () => {
        const events = aggregate.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(StorageCreatedEvent);
      });
    });
  });

  describe('Given a request to create a Warehouse storage', () => {
    describe('When createWarehouse is called with valid props', () => {
      let aggregate: StorageAggregate;

      beforeEach(() => {
        aggregate = StorageAggregate.createWarehouse({
          tenantUUID: TENANT_UUID,
          name: 'Central Warehouse',
          icon: 'wh-icon',
          color: '#667788',
          address: '789 Industrial Blvd',
        });
      });

      it('Then the aggregate has type WAREHOUSE', () => {
        expect(aggregate.type).toBe(StorageType.WAREHOUSE);
      });

      it('Then the warehouse sub-model is populated', () => {
        expect(aggregate.warehouse).not.toBeNull();
        expect(aggregate.warehouse?.address.getValue()).toBe('789 Industrial Blvd');
      });

      it('Then the other sub-models are null', () => {
        expect(aggregate.customRoom).toBeNull();
        expect(aggregate.storeRoom).toBeNull();
      });

      it('Then the address getter returns the warehouse address', () => {
        expect(aggregate.address).toBe('789 Industrial Blvd');
      });

      it('Then a StorageCreatedEvent is emitted', () => {
        const events = aggregate.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(StorageCreatedEvent);
      });
    });
  });

  describe('Given an existing custom room storage', () => {
    let aggregate: StorageAggregate;

    beforeEach(() => {
      aggregate = StorageAggregate.createCustomRoom({
        tenantUUID: TENANT_UUID,
        name: 'Old Name',
        roomType: 'Office',
        icon: 'icon-1',
        color: '#AABBCC',
        address: '123 Main St',
      });
      aggregate.commit();
    });

    describe('When updateCustomRoom name is called', () => {
      beforeEach(() => {
        aggregate.updateCustomRoom({ name: 'New Name' });
      });

      it('Then the name is updated', () => {
        expect(aggregate.name).toBe('New Name');
      });

      it('Then a StorageUpdatedEvent is emitted', () => {
        const events = aggregate.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(StorageUpdatedEvent);
        const event = events[0] as StorageUpdatedEvent;
        expect(event.storageUUID).toBe(aggregate.uuid);
        expect(event.tenantUUID).toBe(TENANT_UUID);
      });
    });

    describe('When updateCustomRoom is called on a wrong type storage', () => {
      it('Then no update is applied and no event is emitted', () => {
        const storeRoom = StorageAggregate.createStoreRoom({
          tenantUUID: TENANT_UUID,
          name: 'Store',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '456 Ave',
        });
        storeRoom.commit();
        storeRoom.updateCustomRoom({ name: 'Attempted Update' });

        expect(storeRoom.name).toBe('Store');
        expect(storeRoom.getUncommittedEvents()).toHaveLength(0);
      });
    });

    describe('When markArchived is called', () => {
      beforeEach(() => {
        aggregate.markArchived();
      });

      it('Then the aggregate is archived', () => {
        expect(aggregate.isArchived()).toBe(true);
        expect(aggregate.archivedAt).toBeInstanceOf(Date);
      });

      it('Then a StorageArchivedEvent is emitted', () => {
        const events = aggregate.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(StorageArchivedEvent);
        const event = events[0] as StorageArchivedEvent;
        expect(event.storageUUID).toBe(aggregate.uuid);
        expect(event.tenantUUID).toBe(TENANT_UUID);
      });
    });
  });

  describe('Given an existing store room storage', () => {
    let aggregate: StorageAggregate;

    beforeEach(() => {
      aggregate = StorageAggregate.createStoreRoom({
        tenantUUID: TENANT_UUID,
        name: 'Old Store',
        icon: 'store-icon',
        color: '#112233',
        address: '789 Elm Rd',
      });
      aggregate.commit();
    });

    describe('When updateStoreRoom is called with a new name', () => {
      it('Then the name is updated and a StorageUpdatedEvent is emitted', () => {
        aggregate.updateStoreRoom({ name: 'Updated Store' });

        expect(aggregate.name).toBe('Updated Store');
        const events = aggregate.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(StorageUpdatedEvent);
      });
    });

    describe('When updateStoreRoom is called on a wrong type storage', () => {
      it('Then no update is applied and no event is emitted', () => {
        const customRoom = StorageAggregate.createCustomRoom({
          tenantUUID: TENANT_UUID,
          name: 'Room',
          roomType: 'Office',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '100 St',
        });
        customRoom.commit();
        customRoom.updateStoreRoom({ name: 'Attempted Update' });

        expect(customRoom.name).toBe('Room');
        expect(customRoom.getUncommittedEvents()).toHaveLength(0);
      });
    });
  });

  describe('Given an existing warehouse storage', () => {
    let aggregate: StorageAggregate;

    beforeEach(() => {
      aggregate = StorageAggregate.createWarehouse({
        tenantUUID: TENANT_UUID,
        name: 'Old Warehouse',
        icon: 'wh-icon',
        color: '#DDEEFF',
        address: '200 Depot Rd',
      });
      aggregate.commit();
    });

    describe('When updateWarehouse is called with a new name', () => {
      it('Then the name is updated and a StorageUpdatedEvent is emitted', () => {
        aggregate.updateWarehouse({ name: 'Updated Warehouse' });

        expect(aggregate.name).toBe('Updated Warehouse');
        const events = aggregate.getUncommittedEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(StorageUpdatedEvent);
      });
    });

    describe('When updateWarehouse is called on a wrong type storage', () => {
      it('Then no update is applied and no event is emitted', () => {
        const customRoom = StorageAggregate.createCustomRoom({
          tenantUUID: TENANT_UUID,
          name: 'Room',
          roomType: 'Office',
          icon: 'icon-1',
          color: '#AABBCC',
          address: '100 St',
        });
        customRoom.commit();
        customRoom.updateWarehouse({ name: 'Attempted Update' });

        expect(customRoom.name).toBe('Room');
        expect(customRoom.getUncommittedEvents()).toHaveLength(0);
      });
    });
  });

  describe('Given persisted storage data', () => {
    describe('When reconstitute is called', () => {
      it('Then all properties are restored correctly', () => {
        const now = new Date();
        const aggregate = StorageAggregate.reconstitute({
          id: 42,
          uuid: '019538a0-0000-7000-8000-000000000099',
          tenantUUID: TENANT_UUID,
          parentUUID: null,
          sub: {
            type: StorageType.CUSTOM_ROOM,
            model: CustomRoomModel.create({
              uuid: '019538a0-0000-7000-8000-000000000098',
              name: 'Restored Room',
              roomType: 'Office',
              icon: 'icon-x',
              color: '#AABBCC',
              address: '123 St',
            }),
          },
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
          frozenAt: null,
        });

        expect(aggregate.id).toBe(42);
        expect(aggregate.uuid).toBe('019538a0-0000-7000-8000-000000000099');
        expect(aggregate.tenantUUID).toBe(TENANT_UUID);
        expect(aggregate.type).toBe(StorageType.CUSTOM_ROOM);
        expect(aggregate.name).toBe('Restored Room');
        expect(aggregate.isArchived()).toBe(false);
        expect(aggregate.isFrozen()).toBe(false);
        expect(aggregate.status).toBe('ACTIVE');
      });

      it('Then parentUUID is mapped when provided', () => {
        const parentUUID = '019538a0-0000-7000-8000-000000000002';
        const aggregate = StorageAggregate.reconstitute({
          id: 43,
          uuid: '019538a0-0000-7000-8000-000000000099',
          tenantUUID: TENANT_UUID,
          parentUUID,
          sub: {
            type: StorageType.CUSTOM_ROOM,
            model: CustomRoomModel.create({
              uuid: '019538a0-0000-7000-8000-000000000098',
              name: 'Child Room',
              roomType: 'Office',
              icon: 'icon-x',
              color: '#AABBCC',
              address: '123 St',
            }),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
          frozenAt: null,
        });

        expect(aggregate.parentUUID).toBe(parentUUID);
      });
    });
  });

  describe('Given a storage reconstituted with frozenAt set', () => {
    describe('When status is read', () => {
      it('Then status is FROZEN and isFrozen is true', () => {
        const aggregate = StorageAggregate.reconstitute({
          id: 5,
          uuid: '019538a0-0000-7000-8000-000000000055',
          tenantUUID: TENANT_UUID,
          parentUUID: null,
          sub: {
            type: StorageType.STORE_ROOM,
            model: StoreRoomModel.create({
              uuid: '019538a0-0000-7000-8000-000000000054',
              name: 'Frozen Store',
              icon: 'store-icon',
              color: '#AABBCC',
              address: '100 Main St',
            }),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
          frozenAt: new Date(),
        });

        expect(aggregate.status).toBe('FROZEN');
        expect(aggregate.isFrozen()).toBe(true);
        expect(aggregate.isArchived()).toBe(false);
        expect(aggregate.frozenAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Given a storage that is both archived and frozen', () => {
    describe('When status is read', () => {
      it('Then ARCHIVED takes precedence over FROZEN', () => {
        const aggregate = StorageAggregate.reconstitute({
          id: 6,
          uuid: '019538a0-0000-7000-8000-000000000056',
          tenantUUID: TENANT_UUID,
          parentUUID: null,
          sub: {
            type: StorageType.STORE_ROOM,
            model: StoreRoomModel.create({
              uuid: '019538a0-0000-7000-8000-000000000053',
              name: 'Archived Store',
              icon: 'store-icon',
              color: '#AABBCC',
              address: '200 Main St',
            }),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: new Date(),
          frozenAt: new Date(),
        });

        expect(aggregate.status).toBe('ARCHIVED');
        expect(aggregate.isArchived()).toBe(true);
        expect(aggregate.isFrozen()).toBe(false);
      });
    });
  });
});
