import { ConvertToStoreRoomMetadata } from '@storage/application/types/convert-metadata.types';

export class ChangeCustomRoomToStoreRoomCommand {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly actorUUID: string,
    public readonly metadata: ConvertToStoreRoomMetadata = {},
  ) {}
}
