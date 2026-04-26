import { UUIDVO } from '@shared/domain/value-objects/compound/uuid.vo';
import { StorageActivityAction } from '@storage/domain/enums/storage-activity-action.enum';
import { StorageActivityLogEntry } from '@storage/domain/models/storage-activity-log-entry.model';
import { StorageActivityLogEntity } from '@storage/infrastructure/entities/storage-activity-log.entity';
import { StorageActivityLogMapper } from '@storage/infrastructure/mappers/storage-activity-log.mapper';

const TENANT_UUID = '019538a0-0000-7000-8000-000000000001';
const STORAGE_UUID = '019538a0-0000-7000-8000-000000000002';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000003';
const ENTRY_UUID = '019538a0-0000-7000-8000-000000000004';

function buildEntity(overrides: Partial<StorageActivityLogEntity> = {}): StorageActivityLogEntity {
  const entity = new StorageActivityLogEntity();
  Object.assign(entity, {
    id: 7,
    uuid: ENTRY_UUID,
    storageUUID: STORAGE_UUID,
    tenantUUID: TENANT_UUID,
    actorUUID: ACTOR_UUID,
    action: StorageActivityAction.CREATED,
    previousValue: null,
    newValue: 'Initial',
    occurredAt: new Date(),
    ...overrides,
  });
  return entity;
}

describe('StorageActivityLogMapper', () => {
  describe('toDomain', () => {
    describe('Given a persisted activity log entity', () => {
      it('Then it reconstitutes a StorageActivityLogEntry with all VOs hydrated', () => {
        const entry = StorageActivityLogMapper.toDomain(buildEntity());

        expect(entry.uuid.toString()).toBe(ENTRY_UUID);
        expect(entry.storageUUID.toString()).toBe(STORAGE_UUID);
        expect(entry.tenantUUID.toString()).toBe(TENANT_UUID);
        expect(entry.actorUUID.toString()).toBe(ACTOR_UUID);
        expect(entry.action).toBe(StorageActivityAction.CREATED);
      });
    });
  });

  describe('toEntity', () => {
    describe('Given an activity log entry with a persisted id', () => {
      it('Then it serializes the id onto the entity', () => {
        const entry = StorageActivityLogEntry.reconstitute({
          id: 7,
          uuid: new UUIDVO(ENTRY_UUID),
          storageUUID: new UUIDVO(STORAGE_UUID),
          tenantUUID: new UUIDVO(TENANT_UUID),
          actorUUID: new UUIDVO(ACTOR_UUID),
          action: StorageActivityAction.CREATED,
          previousValue: null,
          newValue: { name: 'Initial' },
          occurredAt: new Date(),
        });

        const entity = StorageActivityLogMapper.toEntity(entry);

        expect(entity.id).toBe(7);
        expect(entity.uuid).toBe(ENTRY_UUID);
        expect(entity.action).toBe(StorageActivityAction.CREATED);
      });
    });

    describe('Given an activity log entry without a persisted id (new entry)', () => {
      it('Then it omits the id from the entity', () => {
        const entry = StorageActivityLogEntry.create({
          storageUUID: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          action: StorageActivityAction.ARCHIVED,
          previousValue: null,
          newValue: null,
        });

        const entity = StorageActivityLogMapper.toEntity(entry);

        expect(entity.id).toBeUndefined();
        expect(typeof entity.uuid).toBe('string');
        expect(entity.action).toBe(StorageActivityAction.ARCHIVED);
      });
    });
  });
});
