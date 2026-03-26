import { StorageFilters } from '@storage/domain/contracts/storage.repository.interface';

export class ListStoragesQuery {
  constructor(
    public readonly tenantUUID: string,
    public readonly filters?: StorageFilters,
  ) {}
}
