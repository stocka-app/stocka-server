import { validate } from 'uuid';
import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageActivityAction } from '@storage/domain/enums/storage-activity-action.enum';
import { StorageActivityLogEntry } from '@storage/domain/models/storage-activity-log-entry.model';

const STORAGE_UUID = '019538a0-0000-7000-8000-000000000001';
const TENANT_UUID = '019538a0-0000-7000-8000-000000000002';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000003';

// ── StorageActivityLogEntry.create() ──────────────────────────────────────────

describe('StorageActivityLogEntry', () => {
  describe('Given valid UUIDs and action CREATED', () => {
    describe('When create() is called without previousValue or newValue', () => {
      let entry: StorageActivityLogEntry;

      beforeEach(() => {
        entry = StorageActivityLogEntry.create({
          storageUUID: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          action: StorageActivityAction.CREATED,
        });
      });

      it('Then storageUUID, tenantUUID and actorUUID are set correctly', () => {
        expect(entry.storageUUID.toString()).toBe(STORAGE_UUID);
        expect(entry.tenantUUID.toString()).toBe(TENANT_UUID);
        expect(entry.actorUUID.toString()).toBe(ACTOR_UUID);
      });

      it('Then a new valid UUID is generated for the entry', () => {
        expect(validate(entry.uuid.toString())).toBe(true);
      });

      it('Then action is CREATED', () => {
        expect(entry.action).toBe(StorageActivityAction.CREATED);
      });

      it('Then previousValue defaults to null', () => {
        expect(entry.previousValue).toBeNull();
      });

      it('Then newValue defaults to null', () => {
        expect(entry.newValue).toBeNull();
      });

      it('Then occurredAt is a recent Date', () => {
        const now = Date.now();
        expect(entry.occurredAt).toBeInstanceOf(Date);
        expect(entry.occurredAt.getTime()).toBeLessThanOrEqual(now);
        expect(entry.occurredAt.getTime()).toBeGreaterThan(now - 5000);
      });

      it('Then id is undefined because the entry is not yet persisted', () => {
        expect(entry.id).toBeUndefined();
      });
    });

    describe('When create() is called with previousValue and newValue', () => {
      it('Then previousValue and newValue are stored as provided', () => {
        const entry = StorageActivityLogEntry.create({
          storageUUID: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          action: StorageActivityAction.NAME_CHANGED,
          previousValue: { value: 'Old Name' },
          newValue: { value: 'New Name' },
        });

        expect(entry.previousValue).toEqual({ value: 'Old Name' });
        expect(entry.newValue).toEqual({ value: 'New Name' });
        expect(entry.action).toBe(StorageActivityAction.NAME_CHANGED);
      });
    });

    describe('When create() is called with explicit null for previousValue and newValue', () => {
      it('Then both values are null', () => {
        const entry = StorageActivityLogEntry.create({
          storageUUID: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          action: StorageActivityAction.ARCHIVED,
          previousValue: null,
          newValue: null,
        });

        expect(entry.previousValue).toBeNull();
        expect(entry.newValue).toBeNull();
      });
    });
  });

  // ── StorageActivityLogEntry.reconstitute() ───────────────────────────────────

  describe('Given a full set of persisted entry props', () => {
    describe('When reconstitute() is called', () => {
      it('Then all props including id are restored exactly', () => {
        const occurredAt = new Date('2026-01-01T12:00:00Z');
        const entryUUID = '019538a0-0000-7000-8000-000000000099';

        const entry = StorageActivityLogEntry.reconstitute({
          id: 42,
          uuid: new UUIDVO(entryUUID),
          storageUUID: new UUIDVO(STORAGE_UUID),
          tenantUUID: new UUIDVO(TENANT_UUID),
          actorUUID: new UUIDVO(ACTOR_UUID),
          action: StorageActivityAction.ARCHIVED,
          previousValue: null,
          newValue: null,
          occurredAt,
        });

        expect(entry.id).toBe(42);
        expect(entry.uuid.toString()).toBe(entryUUID);
        expect(entry.storageUUID.toString()).toBe(STORAGE_UUID);
        expect(entry.tenantUUID.toString()).toBe(TENANT_UUID);
        expect(entry.actorUUID.toString()).toBe(ACTOR_UUID);
        expect(entry.action).toBe(StorageActivityAction.ARCHIVED);
        expect(entry.occurredAt).toEqual(occurredAt);
        expect(entry.previousValue).toBeNull();
        expect(entry.newValue).toBeNull();
      });

      it('Then id is undefined when not included in props', () => {
        const entry = StorageActivityLogEntry.reconstitute({
          uuid: new UUIDVO('019538a0-0000-7000-8000-000000000098'),
          storageUUID: new UUIDVO(STORAGE_UUID),
          tenantUUID: new UUIDVO(TENANT_UUID),
          actorUUID: new UUIDVO(ACTOR_UUID),
          action: StorageActivityAction.FROZEN,
          previousValue: null,
          newValue: null,
          occurredAt: new Date(),
        });

        expect(entry.id).toBeUndefined();
      });

      it('Then previousValue and newValue are preserved when present', () => {
        const entry = StorageActivityLogEntry.reconstitute({
          id: 7,
          uuid: new UUIDVO('019538a0-0000-7000-8000-000000000097'),
          storageUUID: new UUIDVO(STORAGE_UUID),
          tenantUUID: new UUIDVO(TENANT_UUID),
          actorUUID: new UUIDVO(ACTOR_UUID),
          action: StorageActivityAction.ICON_CHANGED,
          previousValue: { value: 'box' },
          newValue: { value: 'warehouse' },
          occurredAt: new Date(),
        });

        expect(entry.previousValue).toEqual({ value: 'box' });
        expect(entry.newValue).toEqual({ value: 'warehouse' });
      });
    });
  });
});
