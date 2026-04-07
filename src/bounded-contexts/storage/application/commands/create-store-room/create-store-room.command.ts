export class CreateStoreRoomCommand {
  constructor(
    public readonly tenantUUID: string,
    public readonly name: string,
    public readonly address: string,
    public readonly actorUUID: string,
    public readonly description?: string,
  ) {}
}
