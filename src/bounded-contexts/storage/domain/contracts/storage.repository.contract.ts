import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

export interface StoragePage {
  items: StorageAggregate[];
  total: number;
}

export interface IStorageRepository {
  findByUUID(uuid: string, tenantUUID: string): Promise<StorageAggregate | null>;
  findAll(
    tenantUUID: string,
    filters?: { status?: StorageStatus; type?: StorageType },
    pagination?: { page: number; limit: number },
    search?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<StoragePage>;
  countActiveByType(tenantUUID: string, type: StorageType): Promise<number>;
  existsActiveName(tenantUUID: string, name: string): Promise<boolean>;
  save(storage: StorageAggregate): Promise<StorageAggregate>;
  archive(storage: StorageAggregate): Promise<void>;
}
