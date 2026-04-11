import { StorageType } from '@storage/domain/enums/storage-type.enum';

export class ChangeStorageTypeCommand {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly actorUUID: string,
    public readonly targetType: StorageType,
  ) {}
}
