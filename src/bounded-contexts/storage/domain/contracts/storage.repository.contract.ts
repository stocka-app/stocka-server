import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';

export interface IStorageRepository {
  findOrCreate(tenantUUID: string): Promise<StorageAggregate>;
  existsActiveName(tenantUUID: string, name: string): Promise<boolean>;
  /**
   * Resolve the storage parent id for a tenant. Returns null if the tenant has no storage row yet.
   * Use this for handlers that operate directly on per-type repos (no aggregate intermediation).
   */
  findIdByTenantUUID(tenantUUID: string): Promise<number | null>;
}
