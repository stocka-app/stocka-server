import { Repository } from 'typeorm';
import { StorageActivityAction } from '@storage/domain/enums/storage-activity-action.enum';
import { StorageActivityLogEntry } from '@storage/domain/models/storage-activity-log-entry.model';
import { StorageActivityLogEntity } from '@storage/infrastructure/entities/storage-activity-log.entity';
import { TypeOrmStorageActivityLogRepository } from '@storage/infrastructure/repositories/typeorm-storage-activity-log.repository';

const STORAGE_UUID = '019538a0-0000-7000-8000-000000000001';
const TENANT_UUID = '019538a0-0000-7000-8000-000000000002';
const ACTOR_UUID = '019538a0-0000-7000-8000-000000000003';
const ENTRY_UUID = '019538a0-0000-7000-8000-000000000099';

function makeOrmRepo(
  overrides: Partial<jest.Mocked<Repository<StorageActivityLogEntity>>> = {},
): jest.Mocked<Repository<StorageActivityLogEntity>> {
  return {
    save: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as jest.Mocked<Repository<StorageActivityLogEntity>>;
}

describe('TypeOrmStorageActivityLogRepository', () => {
  describe('Given a valid StorageActivityLogEntry', () => {
    describe('When save() is called', () => {
      it('Then the ORM repository save is called once', async () => {
        const ormRepo = makeOrmRepo();
        const repo = new TypeOrmStorageActivityLogRepository(ormRepo);

        const entry = StorageActivityLogEntry.create({
          storageUUID: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          action: StorageActivityAction.CREATED,
          newValue: { name: 'Bodega Norte' },
        });

        await repo.save(entry);

        expect(ormRepo.save).toHaveBeenCalledTimes(1);
      });

      it('Then the entity passed to ORM save has the correct field values', async () => {
        const ormRepo = makeOrmRepo();
        const repo = new TypeOrmStorageActivityLogRepository(ormRepo);

        const entry = StorageActivityLogEntry.create({
          storageUUID: STORAGE_UUID,
          tenantUUID: TENANT_UUID,
          actorUUID: ACTOR_UUID,
          action: StorageActivityAction.CREATED,
          previousValue: null,
          newValue: { name: 'Bodega Norte', type: 'WAREHOUSE' },
        });

        await repo.save(entry);

        const savedEntity = ormRepo.save.mock.calls[0][0] as StorageActivityLogEntity;
        expect(savedEntity.storageUUID).toBe(STORAGE_UUID);
        expect(savedEntity.tenantUUID).toBe(TENANT_UUID);
        expect(savedEntity.actorUUID).toBe(ACTOR_UUID);
        expect(savedEntity.action).toBe(StorageActivityAction.CREATED);
        expect(savedEntity.previousValue).toBeNull();
        expect(savedEntity.newValue).toEqual({ name: 'Bodega Norte', type: 'WAREHOUSE' });
      });
    });
  });

  describe('Given activity log entries exist for a storage', () => {
    describe('When findByStorageUUID() is called', () => {
      it('Then ORM find is called with tenantUUID, storageUUID and DESC order', async () => {
        const ormRepo = makeOrmRepo();
        const repo = new TypeOrmStorageActivityLogRepository(ormRepo);

        await repo.findByStorageUUID(TENANT_UUID, STORAGE_UUID);

        expect(ormRepo.find).toHaveBeenCalledWith({
          where: { tenantUUID: TENANT_UUID, storageUUID: STORAGE_UUID },
          order: { occurredAt: 'DESC' },
        });
      });

      it('Then the returned entries are mapped to domain models', async () => {
        const occurredAt = new Date('2026-01-15T10:00:00Z');
        const rawEntities: StorageActivityLogEntity[] = [
          {
            id: 1,
            uuid: ENTRY_UUID,
            storageUUID: STORAGE_UUID,
            tenantUUID: TENANT_UUID,
            actorUUID: ACTOR_UUID,
            action: StorageActivityAction.CREATED,
            previousValue: null,
            newValue: { name: 'Bodega Norte' },
            occurredAt,
          } as unknown as StorageActivityLogEntity,
        ];

        const ormRepo = makeOrmRepo({ find: jest.fn().mockResolvedValue(rawEntities) });
        const repo = new TypeOrmStorageActivityLogRepository(ormRepo);

        const results = await repo.findByStorageUUID(TENANT_UUID, STORAGE_UUID);

        expect(results).toHaveLength(1);
        expect(results[0]).toBeInstanceOf(StorageActivityLogEntry);
        expect(results[0].storageUUID.toString()).toBe(STORAGE_UUID);
        expect(results[0].tenantUUID.toString()).toBe(TENANT_UUID);
        expect(results[0].action).toBe(StorageActivityAction.CREATED);
        expect(results[0].newValue).toEqual({ name: 'Bodega Norte' });
        expect(results[0].occurredAt).toEqual(occurredAt);
      });

      it('Then it returns an empty array when no entries exist', async () => {
        const ormRepo = makeOrmRepo({ find: jest.fn().mockResolvedValue([]) });
        const repo = new TypeOrmStorageActivityLogRepository(ormRepo);

        const results = await repo.findByStorageUUID(TENANT_UUID, STORAGE_UUID);

        expect(results).toHaveLength(0);
      });
    });
  });
});
