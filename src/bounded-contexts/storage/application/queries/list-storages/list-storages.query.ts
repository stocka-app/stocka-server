import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

export interface StorageFilters {
  status?: StorageStatus;
  type?: StorageType;
}

export class ListStoragesQuery {
  constructor(
    public readonly tenantUUID: string,
    public readonly filters?: StorageFilters,
  ) {}
}
