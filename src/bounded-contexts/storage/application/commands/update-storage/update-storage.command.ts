import { StorageType } from '@storage/domain/enums/storage-type.enum';

export class UpdateStorageCommand {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly actorUUID: string,
    public readonly name?: string,
    public readonly type?: StorageType,
    public readonly description?: string | null,
    public readonly address?: string | null,
    public readonly icon?: string,
    public readonly color?: string,
  ) {}
}
