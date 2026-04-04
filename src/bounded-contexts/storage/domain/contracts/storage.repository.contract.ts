import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';

export interface IStorageRepository {
  findOrCreate(tenantUUID: string): Promise<StorageAggregate>;
  existsActiveName(tenantUUID: string, name: string): Promise<boolean>;
}
