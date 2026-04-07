import { StorageCreatedEventHandler } from '@storage/application/event-handlers/storage-created.event-handler';
import { StorageNameChangedEventHandler } from '@storage/application/event-handlers/storage-name-changed.event-handler';
import { StorageDescriptionChangedEventHandler } from '@storage/application/event-handlers/storage-description-changed.event-handler';
import { StorageAddressChangedEventHandler } from '@storage/application/event-handlers/storage-address-changed.event-handler';
import { StorageIconChangedEventHandler } from '@storage/application/event-handlers/storage-icon-changed.event-handler';
import { StorageColorChangedEventHandler } from '@storage/application/event-handlers/storage-color-changed.event-handler';
import { StorageTypeChangedEventHandler } from '@storage/application/event-handlers/storage-type-changed.event-handler';
import { StorageArchivedEventHandler } from '@storage/application/event-handlers/storage-archived.event-handler';
import { StorageFrozenEventHandler } from '@storage/application/event-handlers/storage-frozen.event-handler';
import { StorageReactivatedEventHandler } from '@storage/application/event-handlers/storage-reactivated.event-handler';
import { StorageCreatedEvent } from '@storage/domain/events/storage-created.event';
import { StorageNameChangedEvent } from '@storage/domain/events/storage-name-changed.event';
import { StorageDescriptionChangedEvent } from '@storage/domain/events/storage-description-changed.event';
import { StorageAddressChangedEvent } from '@storage/domain/events/storage-address-changed.event';
import { StorageIconChangedEvent } from '@storage/domain/events/storage-icon-changed.event';
import { StorageColorChangedEvent } from '@storage/domain/events/storage-color-changed.event';
import { StorageTypeChangedEvent } from '@storage/domain/events/storage-type-changed.event';
import { StorageArchivedEvent } from '@storage/domain/events/storage-archived.event';
import { StorageFrozenEvent } from '@storage/domain/events/storage-frozen.event';
import { StorageReactivatedEvent } from '@storage/domain/events/storage-reactivated.event';
import { StorageActivityLogEntry } from '@storage/domain/models/storage-activity-log-entry.model';
import { IStorageActivityLogRepository } from '@storage/domain/contracts/storage-activity-log.repository.contract';
import { StorageActivityAction } from '@storage/domain/enums/storage-activity-action.enum';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

const STORAGE_UUID = '019538a0-0000-7000-8000-000000000010';
const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000099';

let mockActivityLogRepo: jest.Mocked<IStorageActivityLogRepository>;

beforeEach(() => {
  mockActivityLogRepo = {
    save: jest.fn().mockResolvedValue(undefined),
    findByStorageUUID: jest.fn(),
  };
});

// ── StorageCreatedEventHandler ─────────────────────────────────────────────────

describe('StorageCreatedEventHandler', () => {
  let handler: StorageCreatedEventHandler;

  beforeEach(() => {
    handler = new StorageCreatedEventHandler(mockActivityLogRepo);
  });

  describe('Given a StorageCreatedEvent for a warehouse', () => {
    describe('When handle is called', () => {
      it('Then saves an activity log entry with CREATED action and type/name in newValue', async () => {
        const event = new StorageCreatedEvent(
          STORAGE_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          StorageType.WAREHOUSE,
          'Main Warehouse',
        );

        await handler.handle(event);

        expect(mockActivityLogRepo.save).toHaveBeenCalledTimes(1);
        const savedEntry = mockActivityLogRepo.save.mock.calls[0][0] as StorageActivityLogEntry;
        expect(savedEntry).toBeInstanceOf(StorageActivityLogEntry);
        expect(savedEntry.action).toBe(StorageActivityAction.CREATED);
        expect(savedEntry.storageUUID.toString()).toBe(STORAGE_UUID);
        expect(savedEntry.tenantUUID.toString()).toBe(TENANT_UUID);
        expect(savedEntry.actorUUID.toString()).toBe(ACTOR_UUID);
        expect(savedEntry.previousValue).toBeNull();
        expect(savedEntry.newValue).toEqual({ type: StorageType.WAREHOUSE, name: 'Main Warehouse' });
      });
    });
  });
});

// ── StorageNameChangedEventHandler ────────────────────────────────────────────

describe('StorageNameChangedEventHandler', () => {
  let handler: StorageNameChangedEventHandler;

  beforeEach(() => {
    handler = new StorageNameChangedEventHandler(mockActivityLogRepo);
  });

  describe('Given a StorageNameChangedEvent', () => {
    describe('When handle is called', () => {
      it('Then saves an activity log entry with NAME_CHANGED action and prev/new names', async () => {
        const event = new StorageNameChangedEvent(
          STORAGE_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          'Old Name',
          'New Name',
        );

        await handler.handle(event);

        expect(mockActivityLogRepo.save).toHaveBeenCalledTimes(1);
        const savedEntry = mockActivityLogRepo.save.mock.calls[0][0] as StorageActivityLogEntry;
        expect(savedEntry).toBeInstanceOf(StorageActivityLogEntry);
        expect(savedEntry.action).toBe(StorageActivityAction.NAME_CHANGED);
        expect(savedEntry.actorUUID.toString()).toBe(ACTOR_UUID);
        expect(savedEntry.previousValue).toEqual({ name: 'Old Name' });
        expect(savedEntry.newValue).toEqual({ name: 'New Name' });
      });
    });
  });
});

// ── StorageDescriptionChangedEventHandler ─────────────────────────────────────

describe('StorageDescriptionChangedEventHandler', () => {
  let handler: StorageDescriptionChangedEventHandler;

  beforeEach(() => {
    handler = new StorageDescriptionChangedEventHandler(mockActivityLogRepo);
  });

  describe('Given a StorageDescriptionChangedEvent with a previous description and a new one', () => {
    describe('When handle is called', () => {
      it('Then saves an activity log entry with DESCRIPTION_CHANGED action', async () => {
        const event = new StorageDescriptionChangedEvent(
          STORAGE_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          'Old description',
          'New description',
        );

        await handler.handle(event);

        expect(mockActivityLogRepo.save).toHaveBeenCalledTimes(1);
        const savedEntry = mockActivityLogRepo.save.mock.calls[0][0] as StorageActivityLogEntry;
        expect(savedEntry.action).toBe(StorageActivityAction.DESCRIPTION_CHANGED);
        expect(savedEntry.previousValue).toEqual({ description: 'Old description' });
        expect(savedEntry.newValue).toEqual({ description: 'New description' });
      });
    });
  });

  describe('Given a StorageDescriptionChangedEvent from description to null', () => {
    describe('When handle is called', () => {
      it('Then saves an entry with null newValue description', async () => {
        const event = new StorageDescriptionChangedEvent(
          STORAGE_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          'Had a description',
          null,
        );

        await handler.handle(event);

        const savedEntry = mockActivityLogRepo.save.mock.calls[0][0] as StorageActivityLogEntry;
        expect(savedEntry.previousValue).toEqual({ description: 'Had a description' });
        expect(savedEntry.newValue).toEqual({ description: null });
      });
    });
  });
});

// ── StorageAddressChangedEventHandler ─────────────────────────────────────────

describe('StorageAddressChangedEventHandler', () => {
  let handler: StorageAddressChangedEventHandler;

  beforeEach(() => {
    handler = new StorageAddressChangedEventHandler(mockActivityLogRepo);
  });

  describe('Given a StorageAddressChangedEvent', () => {
    describe('When handle is called', () => {
      it('Then saves an activity log entry with ADDRESS_CHANGED action and prev/new addresses', async () => {
        const event = new StorageAddressChangedEvent(
          STORAGE_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          '100 Old Street',
          '200 New Avenue',
        );

        await handler.handle(event);

        expect(mockActivityLogRepo.save).toHaveBeenCalledTimes(1);
        const savedEntry = mockActivityLogRepo.save.mock.calls[0][0] as StorageActivityLogEntry;
        expect(savedEntry.action).toBe(StorageActivityAction.ADDRESS_CHANGED);
        expect(savedEntry.previousValue).toEqual({ address: '100 Old Street' });
        expect(savedEntry.newValue).toEqual({ address: '200 New Avenue' });
        expect(savedEntry.actorUUID.toString()).toBe(ACTOR_UUID);
      });
    });
  });
});

// ── StorageIconChangedEventHandler ────────────────────────────────────────────

describe('StorageIconChangedEventHandler', () => {
  let handler: StorageIconChangedEventHandler;

  beforeEach(() => {
    handler = new StorageIconChangedEventHandler(mockActivityLogRepo);
  });

  describe('Given a StorageIconChangedEvent', () => {
    describe('When handle is called', () => {
      it('Then saves an activity log entry with ICON_CHANGED action and prev/new icons', async () => {
        const event = new StorageIconChangedEvent(
          STORAGE_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          'warehouse',
          'inventory_2',
        );

        await handler.handle(event);

        expect(mockActivityLogRepo.save).toHaveBeenCalledTimes(1);
        const savedEntry = mockActivityLogRepo.save.mock.calls[0][0] as StorageActivityLogEntry;
        expect(savedEntry.action).toBe(StorageActivityAction.ICON_CHANGED);
        expect(savedEntry.previousValue).toEqual({ icon: 'warehouse' });
        expect(savedEntry.newValue).toEqual({ icon: 'inventory_2' });
      });
    });
  });
});

// ── StorageColorChangedEventHandler ───────────────────────────────────────────

describe('StorageColorChangedEventHandler', () => {
  let handler: StorageColorChangedEventHandler;

  beforeEach(() => {
    handler = new StorageColorChangedEventHandler(mockActivityLogRepo);
  });

  describe('Given a StorageColorChangedEvent', () => {
    describe('When handle is called', () => {
      it('Then saves an activity log entry with COLOR_CHANGED action and prev/new colors', async () => {
        const event = new StorageColorChangedEvent(
          STORAGE_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          '#3b82f6',
          '#a855f7',
        );

        await handler.handle(event);

        expect(mockActivityLogRepo.save).toHaveBeenCalledTimes(1);
        const savedEntry = mockActivityLogRepo.save.mock.calls[0][0] as StorageActivityLogEntry;
        expect(savedEntry.action).toBe(StorageActivityAction.COLOR_CHANGED);
        expect(savedEntry.previousValue).toEqual({ color: '#3b82f6' });
        expect(savedEntry.newValue).toEqual({ color: '#a855f7' });
      });
    });
  });
});

// ── StorageTypeChangedEventHandler ────────────────────────────────────────────

describe('StorageTypeChangedEventHandler', () => {
  let handler: StorageTypeChangedEventHandler;

  beforeEach(() => {
    handler = new StorageTypeChangedEventHandler(mockActivityLogRepo);
  });

  describe('Given a StorageTypeChangedEvent for a custom room roomType change', () => {
    describe('When handle is called', () => {
      it('Then saves an activity log entry with TYPE_CHANGED action and prev/new types', async () => {
        const event = new StorageTypeChangedEvent(
          STORAGE_UUID,
          TENANT_UUID,
          ACTOR_UUID,
          'Office',
          'Workshop',
        );

        await handler.handle(event);

        expect(mockActivityLogRepo.save).toHaveBeenCalledTimes(1);
        const savedEntry = mockActivityLogRepo.save.mock.calls[0][0] as StorageActivityLogEntry;
        expect(savedEntry.action).toBe(StorageActivityAction.TYPE_CHANGED);
        expect(savedEntry.previousValue).toEqual({ type: 'Office' });
        expect(savedEntry.newValue).toEqual({ type: 'Workshop' });
        expect(savedEntry.actorUUID.toString()).toBe(ACTOR_UUID);
      });
    });
  });
});

// ── StorageArchivedEventHandler ───────────────────────────────────────────────

describe('StorageArchivedEventHandler', () => {
  let handler: StorageArchivedEventHandler;

  beforeEach(() => {
    handler = new StorageArchivedEventHandler(mockActivityLogRepo);
  });

  describe('Given a StorageArchivedEvent', () => {
    describe('When handle is called', () => {
      it('Then saves an activity log entry with ARCHIVED action and null prev/new values', async () => {
        const event = new StorageArchivedEvent(STORAGE_UUID, TENANT_UUID, ACTOR_UUID);

        await handler.handle(event);

        expect(mockActivityLogRepo.save).toHaveBeenCalledTimes(1);
        const savedEntry = mockActivityLogRepo.save.mock.calls[0][0] as StorageActivityLogEntry;
        expect(savedEntry.action).toBe(StorageActivityAction.ARCHIVED);
        expect(savedEntry.storageUUID.toString()).toBe(STORAGE_UUID);
        expect(savedEntry.actorUUID.toString()).toBe(ACTOR_UUID);
        expect(savedEntry.previousValue).toBeNull();
        expect(savedEntry.newValue).toBeNull();
      });
    });
  });
});

// ── StorageFrozenEventHandler ─────────────────────────────────────────────────

describe('StorageFrozenEventHandler', () => {
  let handler: StorageFrozenEventHandler;

  beforeEach(() => {
    handler = new StorageFrozenEventHandler(mockActivityLogRepo);
  });

  describe('Given a StorageFrozenEvent', () => {
    describe('When handle is called', () => {
      it('Then saves an activity log entry with FROZEN action and null prev/new values', async () => {
        const event = new StorageFrozenEvent(STORAGE_UUID, TENANT_UUID, ACTOR_UUID);

        await handler.handle(event);

        expect(mockActivityLogRepo.save).toHaveBeenCalledTimes(1);
        const savedEntry = mockActivityLogRepo.save.mock.calls[0][0] as StorageActivityLogEntry;
        expect(savedEntry.action).toBe(StorageActivityAction.FROZEN);
        expect(savedEntry.actorUUID.toString()).toBe(ACTOR_UUID);
        expect(savedEntry.previousValue).toBeNull();
        expect(savedEntry.newValue).toBeNull();
      });
    });
  });
});

// ── StorageReactivatedEventHandler ────────────────────────────────────────────

describe('StorageReactivatedEventHandler', () => {
  let handler: StorageReactivatedEventHandler;

  beforeEach(() => {
    handler = new StorageReactivatedEventHandler(mockActivityLogRepo);
  });

  describe('Given a StorageReactivatedEvent', () => {
    describe('When handle is called', () => {
      it('Then saves an activity log entry with REACTIVATED action and null prev/new values', async () => {
        const event = new StorageReactivatedEvent(STORAGE_UUID, TENANT_UUID, ACTOR_UUID);

        await handler.handle(event);

        expect(mockActivityLogRepo.save).toHaveBeenCalledTimes(1);
        const savedEntry = mockActivityLogRepo.save.mock.calls[0][0] as StorageActivityLogEntry;
        expect(savedEntry.action).toBe(StorageActivityAction.REACTIVATED);
        expect(savedEntry.actorUUID.toString()).toBe(ACTOR_UUID);
        expect(savedEntry.previousValue).toBeNull();
        expect(savedEntry.newValue).toBeNull();
      });
    });
  });
});
