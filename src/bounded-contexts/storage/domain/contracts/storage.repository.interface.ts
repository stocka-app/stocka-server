import { StorageAggregate } from '@storage/domain/aggregates/storage.aggregate';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

export interface IStorageRepository {
  findByUUID(uuid: string, tenantUUID: string): Promise<StorageAggregate | null>;
  findAllActive(tenantUUID: string): Promise<StorageAggregate[]>;
  countActiveByType(tenantUUID: string, type: StorageType): Promise<number>;
  existsActiveName(tenantUUID: string, name: string): Promise<boolean>;
  save(storage: StorageAggregate): Promise<StorageAggregate>;
  archive(storage: StorageAggregate): Promise<void>;
}
