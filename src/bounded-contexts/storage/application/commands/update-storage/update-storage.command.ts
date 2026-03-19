export class UpdateStorageCommand {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly name: string | undefined,
  ) {}
}
