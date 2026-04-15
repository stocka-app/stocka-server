export class UpdateStoreRoomCommand {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly actorUUID: string,
    public readonly name?: string,
    public readonly description?: string | null,
    public readonly address?: string | null,
  ) {}
}
