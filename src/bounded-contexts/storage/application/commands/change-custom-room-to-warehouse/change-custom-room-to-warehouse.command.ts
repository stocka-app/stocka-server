import { ConvertToWarehouseMetadata } from '@storage/application/types/convert-metadata.types';

export class ChangeCustomRoomToWarehouseCommand {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly actorUUID: string,
    public readonly metadata: ConvertToWarehouseMetadata = {},
  ) {}
}
