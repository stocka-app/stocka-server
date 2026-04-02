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

export type StorageSortOrder = 'ASC' | 'DESC';

export class ListStoragesQuery {
  constructor(
    public readonly tenantUUID: string,
    public readonly filters: StorageFilters,
    public readonly pagination: StoragePagination,
    public readonly sortOrder: StorageSortOrder,
    public readonly search?: string,
  ) {}
}
