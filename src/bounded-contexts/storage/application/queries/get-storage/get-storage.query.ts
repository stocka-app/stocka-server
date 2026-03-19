export class GetStorageQuery {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
  ) {}
}
