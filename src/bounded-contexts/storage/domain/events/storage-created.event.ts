export class StorageCreatedEvent {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly type: string,
    public readonly name: string,
  ) {}
}
