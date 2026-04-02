import { StorageActivityLogEntry } from '@storage/domain/models/storage-activity-log-entry.model';

export interface IStorageActivityLogRepository {
  save(entry: StorageActivityLogEntry): Promise<void>;
  findByStorageUUID(tenantUUID: string, storageUUID: string): Promise<StorageActivityLogEntry[]>;
}
