export class UpdateWarehouseCommand {
  constructor(
    public readonly storageUUID: string,
    public readonly tenantUUID: string,
    public readonly name?: string,
    public readonly description?: string | null,
    public readonly address?: string,
  ) {}
}
