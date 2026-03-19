export class StorageArchivedEvent {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
  ) {}
}
