export class ArchiveStorageCommand {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
  ) {}
}
