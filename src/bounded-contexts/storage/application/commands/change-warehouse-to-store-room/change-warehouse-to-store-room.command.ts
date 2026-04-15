import { ConvertToStoreRoomMetadata } from '@storage/application/types/convert-metadata.types';

export class ChangeWarehouseToStoreRoomCommand {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly actorUUID: string,
    public readonly metadata: ConvertToStoreRoomMetadata = {},
  ) {}
}
