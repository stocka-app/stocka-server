export class StorageUpdatedEvent {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
  ) {}
}
