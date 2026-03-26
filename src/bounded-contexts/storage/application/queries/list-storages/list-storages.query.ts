import { StorageStatus } from '@storage/domain/enums/storage-status.enum';
import { StorageType } from '@storage/domain/enums/storage-type.enum';

export interface StorageFilters {
  status?: StorageStatus;
  type?: StorageType;
}

export interface StoragePagination {
  page: number;
  limit: number;
}

export class ListStoragesQuery {
  constructor(
    public readonly tenantUUID: string,
    public readonly filters?: StorageFilters,
    public readonly pagination: StoragePagination = { page: 1, limit: 50 },
    public readonly search?: string,
    public readonly sortOrder: 'ASC' | 'DESC' = 'ASC',
  ) {}
}
