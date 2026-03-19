import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';
import { StorageCreatedEvent } from '@storage/domain/events/storage-created.event';
import { StorageUpdatedEvent } from '@storage/domain/events/storage-updated.event';
import { StorageArchivedEvent } from '@storage/domain/events/storage-archived.event';

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

      it('Then the customRoom sub-model is populated', () => {
        expect(aggregate.customRoom).not.toBeNull();
        expect(aggregate.customRoom?.roomType).toBe('Office');
        expect(aggregate.customRoom?.address).toBe('123 Main St');
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

    describe('When createCustomRoom is called without an address', () => {
      it('Then the custom room address is null', () => {
        const aggregate = StorageAggregate.createCustomRoom({
          tenantUUID: TENANT_UUID,
          name: 'No Address Room',
          roomType: 'Storage',
        });
        expect(aggregate.customRoom?.address).toBeNull();
        expect(aggregate.address).toBeNull();
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
          address: '456 Oak Ave',
        });
      });

      it('Then the aggregate has type STORE_ROOM', () => {
        expect(aggregate.type).toBe(StorageType.STORE_ROOM);
      });

      it('Then the storeRoom sub-model is populated', () => {
        expect(aggregate.storeRoom).not.toBeNull();
        expect(aggregate.storeRoom?.address).toBe('456 Oak Ave');
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

    describe('When createStoreRoom is called without an address', () => {
      it('Then the store room address is null', () => {
        const aggregate = StorageAggregate.createStoreRoom({
          tenantUUID: TENANT_UUID,
          name: 'No Address Store',
        });
        expect(aggregate.storeRoom?.address).toBeNull();
        expect(aggregate.address).toBeNull();
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
          address: '789 Industrial Blvd',
        });
      });

      it('Then the aggregate has type WAREHOUSE', () => {
        expect(aggregate.type).toBe(StorageType.WAREHOUSE);
      });

      it('Then the warehouse sub-model is populated', () => {
        expect(aggregate.warehouse).not.toBeNull();
        expect(aggregate.warehouse?.address).toBe('789 Industrial Blvd');
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

  describe('Given an existing storage aggregate', () => {
    let aggregate: StorageAggregate;

    beforeEach(() => {
      aggregate = StorageAggregate.createCustomRoom({
        tenantUUID: TENANT_UUID,
        name: 'Old Name',
        roomType: 'Office',
      });
      aggregate.commit();
    });

    describe('When updateName is called', () => {
      beforeEach(() => {
        aggregate.updateName('New Name');
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

  describe('Given persisted storage data', () => {
    describe('When reconstitute is called', () => {
      it('Then all properties are restored correctly', () => {
        const now = new Date();
        const aggregate = StorageAggregate.reconstitute({
          id: 42,
          uuid: '019538a0-0000-7000-8000-000000000099',
          tenantUUID: TENANT_UUID,
          type: StorageType.CUSTOM_ROOM,
          name: 'Restored Room',
          customRoom: {
            uuid: '019538a0-0000-7000-8000-000000000098',
            roomType: 'Office',
            address: '123 St',
            createdAt: now,
            updatedAt: now,
          } as never,
          storeRoom: null,
          warehouse: null,
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
        });

        expect(aggregate.id).toBe(42);
        expect(aggregate.uuid).toBe('019538a0-0000-7000-8000-000000000099');
        expect(aggregate.tenantUUID).toBe(TENANT_UUID);
        expect(aggregate.type).toBe(StorageType.CUSTOM_ROOM);
        expect(aggregate.name).toBe('Restored Room');
        expect(aggregate.isArchived()).toBe(false);
      });
    });
  });

  describe('Given a storage without any sub-model', () => {
    describe('When the address getter is called', () => {
      it('Then it returns null', () => {
        const aggregate = StorageAggregate.reconstitute({
          id: 1,
          uuid: '019538a0-0000-7000-8000-000000000050',
          tenantUUID: TENANT_UUID,
          type: StorageType.CUSTOM_ROOM,
          name: 'Empty',
          customRoom: null,
          storeRoom: null,
          warehouse: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        });

        expect(aggregate.address).toBeNull();
      });
    });
  });
});
