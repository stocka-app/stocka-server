export class FreezeStorageCommand {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly actorUUID: string,
  ) {}
}
