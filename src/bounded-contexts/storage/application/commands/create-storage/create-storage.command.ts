import { StorageType } from '@storage/domain/enums/storage-type.enum';

export class CreateStorageCommand {
  constructor(
    public readonly tenantUUID: string,
    public readonly type: StorageType,
    public readonly name: string,
    public readonly description: string | undefined,
    public readonly address: string | undefined,
    public readonly roomType: string | undefined,
  ) {}
}
